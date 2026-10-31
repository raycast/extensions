import { spawn } from "child_process";
import { writeFileSync } from "fs";
import { join } from "path";
import { launchCommand, LaunchType, updateCommandMetadata } from "@raycast/api";
import { expect, vi, test } from "vitest";
import * as PodsControlCli from "../../cli/client";
import { type ListeningModeSubtitleRefreshContext } from "../../commands/launch-context";
import { runToggleConversationAwarenessCommand } from "../../controls/conversation-awareness";
import { runSetListeningModeCommand } from "../../controls/listening-mode";
import cycleListeningMode from "../../cycle-listening-mode";
import { refreshStatus } from "../../status/refresh";
import {
  publishCommandSubtitle,
  resetCommandSubtitle,
  reserveSubtitleRevisionForReset,
} from "../../subtitles/coordination";
import toggleConversationAwareness from "../../toggle-conversation-awareness";
import { expectConsoleError } from "../console";
import { deferred } from "../fixtures/deferred";
import { createSupportDirectory } from "../fixtures/support-directory";
import type { ListeningModes } from "../../features/types";

vi.mock("../../cli/client", async (importOriginal) => ({
  ...(await importOriginal<typeof PodsControlCli>()),
  cycleListeningMode: vi.fn(),
  getConversationAwareness: vi.fn(),
  getListeningMode: vi.fn(),
  setConversationAwareness: vi.fn(),
  setListeningMode: vi.fn(),
}));

const mockLaunchCommand = vi.mocked(launchCommand);

const mockUpdateCommandMetadata = vi.mocked(updateCommandMetadata);

interface LaunchCall {
  name: string;
  context?: Record<string, unknown> | null;
}

function runLockf(path: string, timeout: string): Promise<number | null> {
  return new Promise((resolve, reject) => {
    const lock = spawn("/usr/bin/lockf", ["-s", "-t", timeout, path, "/usr/bin/true"]);
    lock.once("error", reject);
    lock.once("close", (code) => resolve(code));
  });
}

// The device is in Transparency with Conversation Awareness Off, and every CLI call succeeds.
function stubDevice() {
  vi.mocked(PodsControlCli.getListeningMode).mockResolvedValue("transparency");
  vi.mocked(PodsControlCli.setListeningMode).mockResolvedValue("noise-cancellation");
  vi.mocked(PodsControlCli.getConversationAwareness).mockResolvedValue("off");
  vi.mocked(PodsControlCli.setConversationAwareness).mockResolvedValue("on");
}

// These workflows use macOS lockf and must retain real OS locking.

test.skipIf(process.platform !== "darwin")("clears the subtitle when the confirmed metadata write fails", async () => {
  // Given
  using supportDirectory = createSupportDirectory();
  stubDevice();
  const error = new Error("metadata failed");
  expectConsoleError("Failed to update the command subtitle", error);
  mockUpdateCommandMetadata.mockRejectedValueOnce(error);
  // When
  await runSetListeningModeCommand("noise-cancellation", { updateCycleSubtitle: true });
  // Then
  expect(PodsControlCli.setListeningMode).toHaveBeenCalledWith("noise-cancellation");
  expect(mockUpdateCommandMetadata.mock.calls.map(([metadata]) => metadata)).toEqual([
    { subtitle: "Noise Cancellation ●" },
    { subtitle: "Pods Control" },
  ]);
});

test.skipIf(process.platform !== "darwin")(
  "refreshes all subtitles after a control action without retaining its operation lock",
  async () => {
    // Given
    using supportDirectory = createSupportDirectory();
    stubDevice();
    vi.mocked(PodsControlCli.setListeningMode).mockImplementationOnce(async () => {
      vi.mocked(PodsControlCli.getListeningMode).mockResolvedValue("adaptive");
      return "adaptive";
    });
    mockLaunchCommand.mockImplementation(async ({ name, context }) => {
      if (name === "pods-status") {
        await refreshStatus();
      } else if (name === "cycle-listening-mode") {
        await cycleListeningMode({ launchType: LaunchType.Background, launchContext: context } as never);
      } else if (name === "toggle-conversation-awareness") {
        await toggleConversationAwareness({ launchType: LaunchType.Background, launchContext: context } as never);
      }
    });
    // When
    await runSetListeningModeCommand("adaptive", { updateCycleSubtitle: true });
    // Then
    expect(mockUpdateCommandMetadata).toHaveBeenCalledWith({ subtitle: "Adaptive ◑ · CA ○̸" });
    expect(mockUpdateCommandMetadata).toHaveBeenCalledWith({ subtitle: "Adaptive ◑" });
    expect(mockUpdateCommandMetadata).toHaveBeenCalledWith({ subtitle: "Off ○̸" });
    expect(mockLaunchCommand).toHaveBeenCalledTimes(3);
    expect(PodsControlCli.getListeningMode).toHaveBeenCalledOnce();
    expect(PodsControlCli.getConversationAwareness).toHaveBeenCalledOnce();
  },
);

test.skipIf(process.platform !== "darwin")(
  "waits for a status refresh to read the device before a control operation reaches the CLI",
  async () => {
    // Given
    using supportDirectory = createSupportDirectory();
    stubDevice();
    const listeningRead = deferred<ListeningModes>();
    vi.mocked(PodsControlCli.getListeningMode).mockReturnValue(listeningRead.promise);
    // When
    const refreshPromise = refreshStatus();
    const running: Promise<unknown>[] = [refreshPromise];
    try {
      await vi.waitFor(() => expect(PodsControlCli.getListeningMode).toHaveBeenCalledOnce());
      const controlPromise = runSetListeningModeCommand("noise-cancellation", { updateCycleSubtitle: true });
      running.push(controlPromise);
      await Promise.resolve();
      // Then
      expect(PodsControlCli.setListeningMode).not.toHaveBeenCalled();
      listeningRead.resolve("transparency");
      // When
      await Promise.all([refreshPromise, controlPromise]);
      // Then
      expect(PodsControlCli.setListeningMode).toHaveBeenCalledOnce();
      expect(vi.mocked(PodsControlCli.getListeningMode).mock.invocationCallOrder[0]).toBeLessThan(
        vi.mocked(PodsControlCli.setListeningMode).mock.invocationCallOrder[0],
      );
    } finally {
      listeningRead.resolve("transparency");
      await Promise.allSettled(running);
    }
  },
);

test.skipIf(process.platform !== "darwin")(
  "serializes status snapshots so a later refresh cannot publish before an older one finishes",
  async () => {
    // Given
    using supportDirectory = createSupportDirectory();
    stubDevice();
    const firstRead = deferred<ListeningModes>();
    let readCount = 0;
    vi.mocked(PodsControlCli.getListeningMode).mockImplementation(() => {
      if (readCount++ === 0) {
        return firstRead.promise;
      }
      return Promise.resolve("noise-cancellation");
    });
    // When
    const firstRefresh = refreshStatus();
    const running: Promise<unknown>[] = [firstRefresh];
    try {
      await vi.waitFor(() => expect(PodsControlCli.getListeningMode).toHaveBeenCalledOnce());
      const secondRefresh = refreshStatus();
      running.push(secondRefresh);
      await Promise.resolve();
      // Then
      expect(PodsControlCli.getListeningMode).toHaveBeenCalledOnce();
      firstRead.resolve("transparency");
      // When
      await firstRefresh;
      await vi.waitFor(() => expect(PodsControlCli.getListeningMode).toHaveBeenCalledTimes(2));
      await secondRefresh;
      // Then
      expect(mockUpdateCommandMetadata.mock.calls.map(([metadata]) => metadata.subtitle)).toEqual([
        "Transparency ○ · CA ○̸",
        "Noise Cancellation ● · CA ○̸",
      ]);
    } finally {
      firstRead.resolve("transparency");
      await Promise.allSettled(running);
    }
  },
);

test.skipIf(process.platform !== "darwin")(
  "serializes a standalone reset behind an in-flight control operation",
  async () => {
    // Given
    using supportDirectory = createSupportDirectory();
    stubDevice();
    const setResult = deferred<ListeningModes>();
    vi.mocked(PodsControlCli.setListeningMode).mockReturnValue(setResult.promise);
    // When
    const controlPromise = runSetListeningModeCommand("noise-cancellation", { updateCycleSubtitle: true });
    const running: Promise<unknown>[] = [controlPromise];
    try {
      await vi.waitFor(() => expect(PodsControlCli.setListeningMode).toHaveBeenCalledOnce());
      const resetPromise = resetCommandSubtitle({ channel: "listening-mode" });
      running.push(resetPromise);
      await Promise.resolve();
      // Then
      expect(mockUpdateCommandMetadata).not.toHaveBeenCalled();
      setResult.resolve("noise-cancellation");
      // When
      await Promise.all([controlPromise, resetPromise]);
      // Then
      expect(mockUpdateCommandMetadata.mock.calls.map(([metadata]) => metadata)).toEqual([
        { subtitle: "Noise Cancellation ●" },
        { subtitle: "Pods Control" },
      ]);
    } finally {
      setResult.resolve("noise-cancellation");
      await Promise.allSettled(running);
    }
  },
);

test.skipIf(process.platform !== "darwin")(
  "ignores a delayed listening-mode dispatch after a newer confirmed set",
  async () => {
    // Given
    using supportDirectory = createSupportDirectory();
    stubDevice();
    const launches: LaunchCall[] = [];
    mockLaunchCommand.mockImplementation(async (options) => {
      launches.push(options);
    });
    // When
    await refreshStatus();
    const listeningLaunch = launches.find(({ name }) => name === "cycle-listening-mode");
    // Then
    expect(listeningLaunch?.context).toEqual(
      expect.objectContaining({
        operation: "refresh-listening-mode-subtitle",
        mode: "transparency",
        revision: expect.any(String),
      }),
    );
    // When
    await runSetListeningModeCommand("noise-cancellation", { updateCycleSubtitle: true });
    // Then
    const metadataCallCountAfterSet = mockUpdateCommandMetadata.mock.calls.length;
    // When
    await cycleListeningMode({
      launchType: LaunchType.Background,
      arguments: undefined,
      launchContext: listeningLaunch?.context as unknown as ListeningModeSubtitleRefreshContext,
    } as never);
    // Then
    expect(mockUpdateCommandMetadata.mock.calls.length).toBe(metadataCallCountAfterSet);
    expect(mockUpdateCommandMetadata).toHaveBeenLastCalledWith({ subtitle: "Noise Cancellation ●" });
  },
);

test.skipIf(process.platform !== "darwin")(
  "ignores a delayed Conversation Awareness dispatch after a newer confirmed toggle",
  async () => {
    // Given
    using supportDirectory = createSupportDirectory();
    stubDevice();
    const launches: LaunchCall[] = [];
    mockLaunchCommand.mockImplementation(async (options) => {
      launches.push(options);
    });
    // When
    await refreshStatus();
    const conversationLaunch = launches.find(({ name }) => name === "toggle-conversation-awareness");
    // Then
    expect(conversationLaunch?.context).toEqual(
      expect.objectContaining({
        operation: "refresh-conversation-awareness-subtitle",
        state: "off",
        revision: expect.any(String),
      }),
    );
    // When
    await runToggleConversationAwarenessCommand();
    // Then
    const metadataCallCountAfterToggle = mockUpdateCommandMetadata.mock.calls.length;
    // When
    await toggleConversationAwareness({
      launchType: LaunchType.Background,
      arguments: undefined,
      launchContext: conversationLaunch?.context,
    } as never);
    // Then
    expect(mockUpdateCommandMetadata.mock.calls.length).toBe(metadataCallCountAfterToggle);
    expect(mockUpdateCommandMetadata).toHaveBeenLastCalledWith({ subtitle: "On ●" });
  },
);

test.skipIf(process.platform !== "darwin")(
  "re-reads legacy null refresh contexts instead of clearing a current subtitle",
  async () => {
    // Given
    using supportDirectory = createSupportDirectory();
    stubDevice();
    vi.mocked(PodsControlCli.getListeningMode).mockResolvedValue("noise-cancellation");
    // When
    await cycleListeningMode({
      launchType: LaunchType.Background,
      arguments: undefined,
      launchContext: { operation: "refresh-listening-mode-subtitle", mode: null },
    } as never);
    // Then
    expect(PodsControlCli.getListeningMode).toHaveBeenCalledOnce();
    expect(mockUpdateCommandMetadata).toHaveBeenCalledWith({ subtitle: "Noise Cancellation ●" });
    expect(mockUpdateCommandMetadata).not.toHaveBeenCalledWith({ subtitle: null });
  },
);

test.skipIf(process.platform !== "darwin")(
  "re-reads legacy Conversation Awareness null contexts instead of clearing a current subtitle",
  async () => {
    // Given
    using supportDirectory = createSupportDirectory();
    stubDevice();
    vi.mocked(PodsControlCli.getConversationAwareness).mockResolvedValue("on");
    // When
    await toggleConversationAwareness({
      launchType: LaunchType.Background,
      arguments: undefined,
      launchContext: { operation: "refresh-conversation-awareness-subtitle", state: null },
    } as never);
    // Then
    expect(PodsControlCli.getConversationAwareness).toHaveBeenCalledOnce();
    expect(mockUpdateCommandMetadata).toHaveBeenCalledWith({ subtitle: "On ●" });
    expect(mockUpdateCommandMetadata).not.toHaveBeenCalledWith({ subtitle: null });
  },
);

test.skipIf(process.platform !== "darwin").each(["missing", "malformed"] as const)(
  "does not accept an old token after %s state recovery",
  async (kind) => {
    // Given
    using supportDirectory = createSupportDirectory();
    stubDevice();
    const statePath = join(supportDirectory.path, "subtitle-metadata.json");
    if (kind === "malformed") writeFileSync(statePath, "{broken", "utf8");
    // When
    await publishCommandSubtitle("Stale", { channel: "listening-mode", revision: "old-token" });
    // Then
    expect(mockUpdateCommandMetadata).not.toHaveBeenCalled();
    // When
    const freshRevision = await reserveSubtitleRevisionForReset("listening-mode");
    await publishCommandSubtitle("Fresh", { channel: "listening-mode", revision: freshRevision });
    // Then
    expect(freshRevision).not.toBe("old-token");
    expect(mockUpdateCommandMetadata).toHaveBeenCalledWith({ subtitle: "Fresh" });
  },
);

test.skipIf(process.platform !== "darwin")(
  "holds the production operation lock across an awaited control call",
  async () => {
    // Given
    using supportDirectory = createSupportDirectory();
    stubDevice();
    const setResult = deferred<ListeningModes>();
    vi.mocked(PodsControlCli.setListeningMode).mockReturnValue(setResult.promise);
    // When
    const controlPromise = runSetListeningModeCommand("noise-cancellation", { updateCycleSubtitle: true });
    const lockPath = join(supportDirectory.path, "subtitle-operation.lock");
    try {
      await vi.waitFor(() => expect(PodsControlCli.setListeningMode).toHaveBeenCalledOnce());
      // Then
      await expect(runLockf(lockPath, "0")).resolves.toBe(75);
    } finally {
      setResult.resolve("noise-cancellation");
      await controlPromise;
    }
    // Then
    await expect(runLockf(lockPath, "0")).resolves.toBe(0);
  },
);

import { Clipboard, launchCommand, LaunchType, showToast, Toast, updateCommandMetadata } from "@raycast/api";
import { expect, vi, test } from "vitest";
import * as PodsControlCli from "../../cli/client";
import { CliError } from "../../cli/errors";
import { refreshStatus, resetStatusSubtitles, runStatusRefresh } from "../../status/refresh";
import { expectConsoleError } from "../console";
import { createSupportDirectory } from "../fixtures/support-directory";

vi.mock("../../cli/client", () => ({
  getConversationAwareness: vi.fn(),
  getListeningMode: vi.fn(),
}));

const mockLaunchCommand = vi.mocked(launchCommand);

const mockShowToast = vi.mocked(showToast);

const mockUpdateCommandMetadata = vi.mocked(updateCommandMetadata);

function makeToast(): Toast {
  return {
    style: Toast.Style.Animated,
    title: "Reading status...",
    message: undefined,
    primaryAction: undefined,
    secondaryAction: undefined,
    hide: vi.fn(async () => {}),
    show: vi.fn(async () => {}),
    id: "status-refresh",
    options: {},
    callbacks: {},
  } as unknown as Toast;
}

// These workflows use macOS lockf and must retain real OS locking.

test.skipIf(process.platform !== "darwin")(
  "reads each status once and dispatches validated subtitle-only contexts",
  async () => {
    // Given
    using supportDirectory = createSupportDirectory();
    vi.mocked(PodsControlCli.getListeningMode).mockResolvedValue("noise-cancellation");
    vi.mocked(PodsControlCli.getConversationAwareness).mockResolvedValue("on");
    // When
    const result = await refreshStatus();
    // Then
    expect(result).toEqual({
      listeningMode: { status: "fulfilled", value: "noise-cancellation" },
      conversationAwareness: { status: "fulfilled", value: "on" },
      subtitleDispatch: {
        listeningMode: { status: "fulfilled", value: undefined },
        conversationAwareness: { status: "fulfilled", value: undefined },
      },
    });
    expect(PodsControlCli.getListeningMode).toHaveBeenCalledOnce();
    expect(PodsControlCli.getConversationAwareness).toHaveBeenCalledOnce();
    expect(mockUpdateCommandMetadata).toHaveBeenCalledWith({
      subtitle: "Noise Cancellation ● · CA ●",
    });
    const listeningRevision = mockLaunchCommand.mock.calls.find(
      ([options]) => options.name === "cycle-listening-mode",
    )?.[0].context?.revision;
    const conversationRevision = mockLaunchCommand.mock.calls.find(
      ([options]) => options.name === "toggle-conversation-awareness",
    )?.[0].context?.revision;
    expect(listeningRevision).toBe(conversationRevision);
    expect(mockLaunchCommand).toHaveBeenCalledWith({
      name: "cycle-listening-mode",
      type: LaunchType.Background,
      context: {
        operation: "refresh-listening-mode-subtitle",
        mode: "noise-cancellation",
        revision: expect.any(String),
      },
    });
    expect(mockLaunchCommand).toHaveBeenCalledWith({
      name: "toggle-conversation-awareness",
      type: LaunchType.Background,
      context: {
        operation: "refresh-conversation-awareness-subtitle",
        state: "on",
        revision: expect.any(String),
      },
    });
  },
);

test.skipIf(process.platform !== "darwin").each([
  { name: "listening mode", listeningFails: true, conversationFails: false },
  { name: "Conversation Awareness", listeningFails: false, conversationFails: true },
  { name: "both features", listeningFails: true, conversationFails: true },
])("retains successful reads when subtitle dispatch fails for $name", async ({ listeningFails, conversationFails }) => {
  // Given
  using supportDirectory = createSupportDirectory();
  vi.mocked(PodsControlCli.getListeningMode).mockResolvedValue("noise-cancellation");
  vi.mocked(PodsControlCli.getConversationAwareness).mockResolvedValue("on");
  const listeningError = new Error("Cycle Listening Mode is disabled");
  const conversationError = new Error("Conversation Awareness is disabled");
  mockLaunchCommand.mockImplementation(async ({ name }) => {
    if (name === "cycle-listening-mode" && listeningFails) throw listeningError;
    if (name === "toggle-conversation-awareness" && conversationFails) throw conversationError;
  });
  // When
  const result = await refreshStatus();
  // Then
  expect(result.listeningMode).toEqual({ status: "fulfilled", value: "noise-cancellation" });
  expect(result.conversationAwareness).toEqual({ status: "fulfilled", value: "on" });
  expect(result.subtitleDispatch).toEqual({
    listeningMode: listeningFails
      ? { status: "rejected", reason: listeningError }
      : { status: "fulfilled", value: undefined },
    conversationAwareness: conversationFails
      ? { status: "rejected", reason: conversationError }
      : { status: "fulfilled", value: undefined },
  });
});

test.skipIf(process.platform !== "darwin")(
  "publishes the confirmed partial status and resets only the unread feature",
  async () => {
    // Given
    using supportDirectory = createSupportDirectory();
    vi.mocked(PodsControlCli.getListeningMode).mockResolvedValue("noise-cancellation");
    vi.mocked(PodsControlCli.getConversationAwareness).mockRejectedValue(new CliError("unsupported"));
    // When
    await refreshStatus();
    // Then
    expect(mockUpdateCommandMetadata).toHaveBeenCalledWith({ subtitle: "Noise Cancellation ●" });
    expect(mockLaunchCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({ operation: "refresh-listening-mode-subtitle", mode: "noise-cancellation" }),
      }),
    );
    expect(mockLaunchCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({ operation: "refresh-conversation-awareness-subtitle", state: null }),
      }),
    );
  },
);

test.skipIf(process.platform !== "darwin").each([
  ["no-device", "Not connected"],
  ["unavailable", "Pods Control"],
] as const)("publishes the appropriate subtitle for %s", async (code, subtitle) => {
  // Given
  using supportDirectory = createSupportDirectory();
  vi.mocked(PodsControlCli.getListeningMode).mockResolvedValue("noise-cancellation");
  vi.mocked(PodsControlCli.getConversationAwareness).mockResolvedValue("on");
  const error = new CliError(code);
  vi.mocked(PodsControlCli.getListeningMode).mockRejectedValue(error);
  vi.mocked(PodsControlCli.getConversationAwareness).mockRejectedValue(error);
  // When
  await refreshStatus();
  // Then
  expect(mockUpdateCommandMetadata).toHaveBeenCalledWith({ subtitle });
});

test.skipIf(process.platform !== "darwin")(
  "updates the subtitle when the device disconnects and reconnects",
  async () => {
    // Given
    using supportDirectory = createSupportDirectory();
    vi.mocked(PodsControlCli.getListeningMode)
      .mockResolvedValueOnce("noise-cancellation")
      .mockRejectedValueOnce(new CliError("no-device"))
      .mockResolvedValueOnce("transparency");
    vi.mocked(PodsControlCli.getConversationAwareness)
      .mockResolvedValueOnce("on")
      .mockRejectedValueOnce(new CliError("no-device"))
      .mockResolvedValueOnce("off");
    // When
    await refreshStatus();
    // Then
    expect(mockUpdateCommandMetadata).toHaveBeenLastCalledWith({ subtitle: "Noise Cancellation ● · CA ●" });
    // When
    await refreshStatus();
    // Then
    expect(mockUpdateCommandMetadata).toHaveBeenLastCalledWith({ subtitle: "Not connected" });
    // When
    await refreshStatus();
    // Then
    expect(mockUpdateCommandMetadata.mock.calls).toEqual([
      [{ subtitle: "Noise Cancellation ● · CA ●" }],
      [{ subtitle: "Not connected" }],
      [{ subtitle: "Transparency ○ · CA ○̸" }],
    ]);
  },
);

test.skipIf(process.platform !== "darwin")(
  "keeps a confirmed reading when the other read reports Not connected",
  async () => {
    // Given
    using supportDirectory = createSupportDirectory();
    vi.mocked(PodsControlCli.getListeningMode).mockResolvedValue("noise-cancellation");
    vi.mocked(PodsControlCli.getConversationAwareness).mockRejectedValue(new CliError("no-device"));
    // When
    await refreshStatus();
    // Then
    expect(mockUpdateCommandMetadata).toHaveBeenCalledExactlyOnceWith({ subtitle: "Noise Cancellation ●" });
  },
);

test.skipIf(process.platform !== "darwin")(
  "publishes Not connected when the other read fails transiently",
  async () => {
    // Given
    using supportDirectory = createSupportDirectory();
    vi.mocked(PodsControlCli.getListeningMode).mockRejectedValue(new CliError("no-device"));
    vi.mocked(PodsControlCli.getConversationAwareness).mockRejectedValue(new Error("timeout"));
    // When
    await refreshStatus();
    // Then
    expect(mockUpdateCommandMetadata).toHaveBeenCalledExactlyOnceWith({ subtitle: "Not connected" });
  },
);

test.skipIf(process.platform !== "darwin")("stays silent when a background refresh finds Not connected", async () => {
  // Given
  using supportDirectory = createSupportDirectory();
  vi.mocked(PodsControlCli.getListeningMode).mockRejectedValue(new CliError("no-device"));
  vi.mocked(PodsControlCli.getConversationAwareness).mockRejectedValue(new CliError("no-device"));
  // When
  await runStatusRefresh({ showFeedback: false });
  // Then
  expect(mockShowToast).not.toHaveBeenCalled();
  expect(mockUpdateCommandMetadata).toHaveBeenCalledWith({ subtitle: "Not connected" });
});

test.skipIf(process.platform !== "darwin")(
  "preserves a previously published subtitle after a transient total read failure",
  async () => {
    // Given
    using supportDirectory = createSupportDirectory();
    vi.mocked(PodsControlCli.getListeningMode)
      .mockResolvedValueOnce("noise-cancellation")
      .mockRejectedValue(new Error("timeout"));
    vi.mocked(PodsControlCli.getConversationAwareness)
      .mockResolvedValueOnce("on")
      .mockRejectedValue(new Error("timeout"));
    // When
    await refreshStatus();
    // Then
    expect(mockUpdateCommandMetadata).toHaveBeenCalledExactlyOnceWith({ subtitle: "Noise Cancellation ● · CA ●" });
    // When
    await refreshStatus();
    // Then
    expect(mockUpdateCommandMetadata).toHaveBeenCalledExactlyOnceWith({ subtitle: "Noise Cancellation ● · CA ●" });
  },
);

test.skipIf(process.platform !== "darwin")(
  "dispatches neutral subtitles without querying the CLI during setup fallback",
  async () => {
    // Given
    using supportDirectory = createSupportDirectory();
    vi.mocked(PodsControlCli.getListeningMode).mockResolvedValue("noise-cancellation");
    vi.mocked(PodsControlCli.getConversationAwareness).mockResolvedValue("on");
    // When
    await resetStatusSubtitles();
    // Then
    expect(PodsControlCli.getListeningMode).not.toHaveBeenCalled();
    expect(PodsControlCli.getConversationAwareness).not.toHaveBeenCalled();
    expect(mockLaunchCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({ operation: "refresh-listening-mode-subtitle", mode: null }),
      }),
    );
    expect(mockLaunchCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({ operation: "refresh-conversation-awareness-subtitle", state: null }),
      }),
    );
  },
);

test.skipIf(process.platform !== "darwin")("logs rejected subtitle launches during setup fallback", async () => {
  // Given
  using supportDirectory = createSupportDirectory();
  vi.mocked(PodsControlCli.getListeningMode).mockResolvedValue("noise-cancellation");
  vi.mocked(PodsControlCli.getConversationAwareness).mockResolvedValue("on");
  const error = new Error("Cycle Listening Mode is disabled");
  expectConsoleError("Failed to dispatch Cycle Listening Mode subtitle refresh", error);
  mockLaunchCommand.mockRejectedValueOnce(error);
  // When
  const result = resetStatusSubtitles();
  // Then
  await expect(result).resolves.toBeUndefined();
});

test.skipIf(process.platform !== "darwin")("stays silent on a scheduled refresh", async () => {
  // Given
  using supportDirectory = createSupportDirectory();
  vi.mocked(PodsControlCli.getListeningMode).mockResolvedValue("noise-cancellation");
  vi.mocked(PodsControlCli.getConversationAwareness).mockResolvedValue("on");
  // When
  await runStatusRefresh({ showFeedback: false });
  // Then
  expect(mockShowToast).not.toHaveBeenCalled();
  expect(mockLaunchCommand).toHaveBeenCalledTimes(2);
});

test.skipIf(process.platform !== "darwin")(
  "logs each rejected subtitle launch while staying silent in the background",
  async () => {
    // Given
    using supportDirectory = createSupportDirectory();
    vi.mocked(PodsControlCli.getListeningMode).mockResolvedValue("noise-cancellation");
    vi.mocked(PodsControlCli.getConversationAwareness).mockResolvedValue("on");
    const listeningError = new Error("Cycle Listening Mode is disabled");
    const conversationError = new Error("Conversation Awareness is disabled");
    expectConsoleError("Failed to dispatch Cycle Listening Mode subtitle refresh", listeningError);
    expectConsoleError("Failed to dispatch Toggle Conversation Awareness subtitle refresh", conversationError);
    mockLaunchCommand.mockRejectedValueOnce(listeningError).mockRejectedValueOnce(conversationError);
    // When
    await runStatusRefresh({ showFeedback: false });
    // Then
    expect(mockShowToast).not.toHaveBeenCalled();
  },
);

test.skipIf(process.platform !== "darwin")(
  "keeps Raycast open and reports both confirmed states in a success toast",
  async () => {
    // Given
    using supportDirectory = createSupportDirectory();
    vi.mocked(PodsControlCli.getListeningMode).mockResolvedValue("noise-cancellation");
    vi.mocked(PodsControlCli.getConversationAwareness).mockResolvedValue("on");
    const toast = makeToast();
    mockShowToast.mockResolvedValueOnce(toast);
    // When
    await runStatusRefresh({ showFeedback: true });
    // Then
    expect(mockShowToast).toHaveBeenCalledWith({
      style: Toast.Style.Animated,
      title: "Reading status...",
    });
    expect(toast.style).toBe(Toast.Style.Success);
    expect(toast.message).toBe("Listening Mode: Noise Cancellation ● · Conversation Awareness: On ●");
    expect(toast.primaryAction).toBeUndefined();
    expect(toast.show).toHaveBeenCalledOnce();
  },
);

test.skipIf(process.platform !== "darwin")(
  "reports a subtitle launch failure while retaining both confirmed states",
  async () => {
    // Given
    using supportDirectory = createSupportDirectory();
    vi.mocked(PodsControlCli.getListeningMode).mockResolvedValue("noise-cancellation");
    vi.mocked(PodsControlCli.getConversationAwareness).mockResolvedValue("on");
    const toast = makeToast();
    const error = new Error("Cycle Listening Mode is disabled");
    mockShowToast.mockResolvedValueOnce(toast);
    mockLaunchCommand.mockRejectedValueOnce(error);
    // When
    await runStatusRefresh({ showFeedback: true });
    // Then
    expect(toast.style).toBe(Toast.Style.Failure);
    expect(toast.message).toBe(
      "Listening Mode: Noise Cancellation ● · Conversation Awareness: On ● · Listening Mode subtitle: Cycle Listening Mode is disabled",
    );
    expect(toast.primaryAction).toEqual(expect.objectContaining({ title: "Copy Error" }));
    // When
    await toast.primaryAction?.onAction(toast);
    // Then
    expect(Clipboard.copy).toHaveBeenCalledWith(toast.message);
    expect(toast.show).toHaveBeenCalledOnce();
  },
);

test.skipIf(process.platform !== "darwin")(
  "includes read and subtitle launch failures in user-initiated feedback",
  async () => {
    // Given
    using supportDirectory = createSupportDirectory();
    vi.mocked(PodsControlCli.getListeningMode).mockResolvedValue("noise-cancellation");
    vi.mocked(PodsControlCli.getConversationAwareness).mockResolvedValue("on");
    const toast = makeToast();
    const readError = new CliError("unsupported");
    const launchError = new Error("Cycle Listening Mode is disabled");
    mockShowToast.mockResolvedValueOnce(toast);
    vi.mocked(PodsControlCli.getConversationAwareness).mockRejectedValue(readError);
    mockLaunchCommand.mockRejectedValueOnce(launchError);
    // When
    await runStatusRefresh({ showFeedback: true });
    // Then
    expect(toast.style).toBe(Toast.Style.Failure);
    expect(toast.message).toContain("Listening Mode: Noise Cancellation ●");
    expect(toast.message).toContain("Conversation Awareness:");
    expect(toast.message).toContain("Listening Mode subtitle: Cycle Listening Mode is disabled");
    expect(toast.primaryAction).toEqual(expect.objectContaining({ title: "Copy Error" }));
    expect(toast.show).toHaveBeenCalledOnce();
  },
);

test.skipIf(process.platform !== "darwin")(
  "reports a partial refresh while preserving the confirmed status",
  async () => {
    // Given
    using supportDirectory = createSupportDirectory();
    vi.mocked(PodsControlCli.getListeningMode).mockResolvedValue("noise-cancellation");
    const toast = makeToast();
    mockShowToast.mockResolvedValueOnce(toast);
    vi.mocked(PodsControlCli.getConversationAwareness).mockRejectedValue(new CliError("unsupported"));
    // When
    await runStatusRefresh({ showFeedback: true });
    // Then
    expect(toast.style).toBe(Toast.Style.Failure);
    expect(toast.message).toContain("Listening Mode: Noise Cancellation ●");
    expect(toast.message).toContain("Conversation Awareness:");
    expect(toast.message).not.toContain("Conversation Awareness: On ●");
    expect(toast.primaryAction).toEqual(expect.objectContaining({ title: "Copy Error" }));
    expect(toast.show).toHaveBeenCalledOnce();
  },
);

test.skipIf(process.platform !== "darwin")(
  "reports Not connected as a normal status without error actions",
  async () => {
    // Given
    using supportDirectory = createSupportDirectory();
    const toast = makeToast();
    mockShowToast.mockResolvedValueOnce(toast);
    vi.mocked(PodsControlCli.getListeningMode).mockRejectedValue(new CliError("no-device"));
    vi.mocked(PodsControlCli.getConversationAwareness).mockRejectedValue(new CliError("no-device"));
    // When
    await runStatusRefresh({ showFeedback: true });
    // Then
    expect(toast.style).toBe(Toast.Style.Success);
    expect(toast.primaryAction).toBeUndefined();
    expect(toast.secondaryAction).toBeUndefined();
    expect(toast.show).toHaveBeenCalledOnce();
  },
);

test.skipIf(process.platform !== "darwin")("still reports subtitle dispatch failures when Not connected", async () => {
  // Given
  using supportDirectory = createSupportDirectory();
  const toast = makeToast();
  mockShowToast.mockResolvedValueOnce(toast);
  vi.mocked(PodsControlCli.getListeningMode).mockRejectedValue(new CliError("no-device"));
  vi.mocked(PodsControlCli.getConversationAwareness).mockRejectedValue(new CliError("no-device"));
  mockLaunchCommand.mockRejectedValueOnce(new Error("Cycle Listening Mode is disabled"));
  // When
  await runStatusRefresh({ showFeedback: true });
  // Then
  expect(toast.style).toBe(Toast.Style.Failure);
  expect(toast.message).toContain("Cycle Listening Mode is disabled");
  expect(toast.primaryAction).toEqual(expect.objectContaining({ title: "Copy Error" }));
  expect(toast.show).toHaveBeenCalledOnce();
});

import { getPreferenceValues, launchCommand, LaunchType, openCommandPreferences } from "@raycast/api";
import { expect, vi, test } from "vitest";
import * as PodsControlCli from "../../cli/client";
import { CliError } from "../../cli/errors";
import { runToggleConversationAwarenessCommand } from "../../controls/conversation-awareness";
import { runCycleListeningModeCommand, runSetListeningModeCommand } from "../../controls/listening-mode";
import { ToastManager } from "../../feedback/toast-manager";
import { publishCommandSubtitle, resetCommandSubtitle, withSubtitleOperation } from "../../subtitles/coordination";
import { refreshConversationAwarenessSubtitle, refreshListeningModeSubtitle } from "../../subtitles/feature-subtitles";
import { expectConsoleError } from "../console";

vi.mock("../../cli/client", async (importOriginal) => ({
  ...(await importOriginal<typeof PodsControlCli>()),
  cycleListeningMode: vi.fn(),
  getConversationAwareness: vi.fn(),
  getListeningMode: vi.fn(),
  setConversationAwareness: vi.fn(),
  setListeningMode: vi.fn(),
}));

vi.mock("../../subtitles/coordination", () => ({
  publishCommandSubtitle: vi.fn(),
  resetCommandSubtitle: vi.fn(),
  withSubtitleOperation: vi.fn(async (_channel, operation) => operation("test-revision")),
}));

vi.mock("../../feedback/toast-manager", () => ({
  ToastManager: vi.fn(),
}));

const mockGetPreferenceValues = vi.mocked(getPreferenceValues);

const mockOpenCommandPreferences = vi.mocked(openCommandPreferences);

const mockPublishCommandSubtitle = vi.mocked(publishCommandSubtitle);

const mockResetCommandSubtitle = vi.mocked(resetCommandSubtitle);

const mockToastManager = vi.mocked(ToastManager);

const defaultCyclePreferences: Preferences.CycleListeningMode = {
  cycleOff: false,
  cycleTransparency: true,
  cycleAdaptive: true,
  cycleAnc: true,
};

// The device is in Transparency with Conversation Awareness Off, and every CLI call succeeds.
// Returns the toast every ToastManager in the workflow shares.
function stubControlWorkflow() {
  const toast = {
    setToLoading: vi.fn(async () => undefined),
    setToSuccess: vi.fn(async () => undefined),
    setToFailure: vi.fn(async () => undefined),
  };
  mockToastManager.mockImplementation(function (this: unknown) {
    Object.assign(this as object, toast);
    return this as ToastManager;
  });
  mockGetPreferenceValues.mockReturnValue({ ...defaultCyclePreferences } as never);
  vi.mocked(PodsControlCli.setListeningMode).mockResolvedValue("transparency");
  vi.mocked(PodsControlCli.getListeningMode).mockResolvedValue("transparency");
  vi.mocked(PodsControlCli.cycleListeningMode).mockResolvedValue("transparency");
  vi.mocked(PodsControlCli.getConversationAwareness).mockResolvedValue("off");
  vi.mocked(PodsControlCli.setConversationAwareness).mockResolvedValue("on");
  return toast;
}

function enabledListeningModes(): string[] {
  expect(PodsControlCli.cycleListeningMode).toHaveBeenCalledOnce();
  const modes = vi.mocked(PodsControlCli.cycleListeningMode).mock.calls[0][0] ?? [];
  return [...modes].sort();
}

test.each([
  ["set", () => runSetListeningModeCommand("adaptive", { updateCycleSubtitle: true })],
  ["fallback set", () => runSetListeningModeCommand("adaptive", { updateCycleSubtitle: false })],
  ["cycle", runCycleListeningModeCommand],
  ["toggle", runToggleConversationAwarenessCommand],
] as const)("requests a status refresh after %s releases its lock", async (_name, run) => {
  // Given
  const toast = stubControlWorkflow();
  let locked = false;
  vi.mocked(withSubtitleOperation).mockImplementationOnce(async (_channel, operation) => {
    locked = true;
    try {
      return await operation("test-revision");
    } finally {
      locked = false;
    }
  });
  vi.mocked(launchCommand).mockImplementationOnce(async () => {
    expect(locked).toBe(false);
    expect(toast.setToSuccess).toHaveBeenCalledOnce();
  });
  // When
  await run();
  // Then
  expect(launchCommand).toHaveBeenCalledExactlyOnceWith({
    name: "pods-status",
    type: LaunchType.Background,
  });
});

test("requests reconciliation after a failed control attempt", async () => {
  // Given
  const toast = stubControlWorkflow();
  vi.mocked(PodsControlCli.setListeningMode).mockRejectedValueOnce(new CliError("no-device"));
  // When
  await runSetListeningModeCommand("adaptive", { updateCycleSubtitle: true });
  // Then
  expect(toast.setToFailure).toHaveBeenCalledOnce();
  expect(launchCommand).toHaveBeenCalledOnce();
});

test("preserves control success when the status command is disabled", async () => {
  // Given
  const toast = stubControlWorkflow();
  const error = new Error("command disabled");
  expectConsoleError("Failed to launch Pods Status after control action", error);
  vi.mocked(launchCommand).mockRejectedValueOnce(error);
  // When
  const result = runSetListeningModeCommand("adaptive", { updateCycleSubtitle: true });
  // Then
  await expect(result).resolves.toBeUndefined();
  expect(toast.setToSuccess).toHaveBeenCalledOnce();
  expect(toast.setToFailure).not.toHaveBeenCalled();
});

test("does not launch a refresh when the control lock cannot be acquired", async () => {
  // Given
  stubControlWorkflow();
  vi.mocked(withSubtitleOperation).mockRejectedValueOnce(new Error("lock unavailable"));
  // When
  await runSetListeningModeCommand("adaptive", { updateCycleSubtitle: true });
  // Then
  expect(PodsControlCli.setListeningMode).not.toHaveBeenCalled();
  expect(launchCommand).not.toHaveBeenCalled();
});

test("does not launch another refresh from subtitle-only background reads", async () => {
  // Given
  stubControlWorkflow();
  // When
  await refreshListeningModeSubtitle();
  await refreshConversationAwarenessSubtitle();
  // Then
  expect(launchCommand).not.toHaveBeenCalled();
});

test("publishes the current listening mode without changing it or showing feedback", async () => {
  // Given
  stubControlWorkflow();
  vi.mocked(PodsControlCli.getListeningMode).mockResolvedValue("noise-cancellation");
  // When
  await refreshListeningModeSubtitle();
  // Then
  expect(PodsControlCli.getListeningMode).toHaveBeenCalledOnce();
  expect(mockPublishCommandSubtitle).toHaveBeenCalledWith("Noise Cancellation ●", {
    channel: "listening-mode",
    revision: "test-revision",
  });
  expect(PodsControlCli.cycleListeningMode).not.toHaveBeenCalled();
  expect(PodsControlCli.setListeningMode).not.toHaveBeenCalled();
  expect(mockToastManager).not.toHaveBeenCalled();
});

test("resets the subtitle when the listening mode cannot be read", async () => {
  // Given
  stubControlWorkflow();
  vi.mocked(PodsControlCli.getListeningMode).mockRejectedValue(new CliError("no-device"));
  // When
  const result = refreshListeningModeSubtitle();
  // Then
  await expect(result).resolves.toBeUndefined();
  expect(mockPublishCommandSubtitle).not.toHaveBeenCalled();
  expect(mockResetCommandSubtitle).toHaveBeenCalledOnce();
  expect(mockToastManager).not.toHaveBeenCalled();
});

test("publishes the current Conversation Awareness state without changing it or showing feedback", async () => {
  // Given
  stubControlWorkflow();
  vi.mocked(PodsControlCli.getConversationAwareness).mockResolvedValue("off");
  // When
  await refreshConversationAwarenessSubtitle();
  // Then
  expect(PodsControlCli.getConversationAwareness).toHaveBeenCalledOnce();
  expect(mockPublishCommandSubtitle).toHaveBeenCalledWith("Off ○̸", {
    channel: "conversation-awareness",
    revision: "test-revision",
  });
  expect(PodsControlCli.setConversationAwareness).not.toHaveBeenCalled();
  expect(mockToastManager).not.toHaveBeenCalled();
});

test("resets the subtitle when Conversation Awareness cannot be read", async () => {
  // Given
  stubControlWorkflow();
  vi.mocked(PodsControlCli.getConversationAwareness).mockRejectedValue(new CliError("unsupported"));
  // When
  const result = refreshConversationAwarenessSubtitle();
  // Then
  await expect(result).resolves.toBeUndefined();
  expect(mockPublishCommandSubtitle).not.toHaveBeenCalled();
  expect(mockResetCommandSubtitle).toHaveBeenCalledOnce();
  expect(mockToastManager).not.toHaveBeenCalled();
});

test("publishes the confirmed mode after setting it", async () => {
  // Given
  const toast = stubControlWorkflow();
  vi.mocked(PodsControlCli.setListeningMode).mockResolvedValue("noise-cancellation");
  // When
  await runSetListeningModeCommand("noise-cancellation", { updateCycleSubtitle: true });
  // Then
  expect(PodsControlCli.setListeningMode).toHaveBeenCalledWith("noise-cancellation");
  expect(mockPublishCommandSubtitle).toHaveBeenCalledExactlyOnceWith("Noise Cancellation ●", {
    channel: "listening-mode",
    revision: "test-revision",
  });
  expect(vi.mocked(PodsControlCli.setListeningMode).mock.invocationCallOrder[0]).toBeLessThan(
    mockPublishCommandSubtitle.mock.invocationCallOrder[0],
  );
  expect(toast.setToSuccess).toHaveBeenCalledWith({ titleOverride: "Set to Noise Cancellation ●" });
});

test("does not update the fixed command subtitle in the disabled-Cycle fallback", async () => {
  // Given
  const toast = stubControlWorkflow();
  // When
  await runSetListeningModeCommand("transparency", { updateCycleSubtitle: false });
  // Then
  expect(mockPublishCommandSubtitle).not.toHaveBeenCalled();
  expect(toast.setToSuccess).toHaveBeenCalledWith({ titleOverride: "Set to Transparency ○" });
});

test("publishes a confirmed remaining state from a failed change", async () => {
  // Given
  const toast = stubControlWorkflow();
  const error = new CliError("no-op", {
    result: "error",
    device: "My AirPods Pro",
    listeningMode: "transparency",
  });
  vi.mocked(PodsControlCli.setListeningMode).mockRejectedValue(error);
  // When
  await runSetListeningModeCommand("noise-cancellation", { updateCycleSubtitle: true });
  // Then
  expect(mockPublishCommandSubtitle).toHaveBeenCalledExactlyOnceWith("Transparency ○", {
    channel: "listening-mode",
    revision: "test-revision",
  });
  expect(toast.setToFailure).toHaveBeenCalledWith({ error });
  expect(toast.setToSuccess).not.toHaveBeenCalled();
});

test("gives Off its own failure title", async () => {
  // Given
  const toast = stubControlWorkflow();
  vi.mocked(PodsControlCli.setListeningMode).mockRejectedValue(new CliError("no-op"));
  // When
  await runSetListeningModeCommand("off", { updateCycleSubtitle: true });
  // Then
  expect(toast.setToFailure).toHaveBeenCalledWith({ titleOverride: "Off was not set", error: expect.any(Error) });
  expect(mockPublishCommandSubtitle).not.toHaveBeenCalled();
  expect(mockResetCommandSubtitle).toHaveBeenCalledOnce();
});

test("resets the subtitle after an unexpected failure", async () => {
  // Given
  stubControlWorkflow();
  vi.mocked(PodsControlCli.setListeningMode).mockRejectedValue(new Error("unexpected"));
  // When
  await runSetListeningModeCommand("adaptive", { updateCycleSubtitle: true });
  // Then
  expect(mockPublishCommandSubtitle).not.toHaveBeenCalled();
  expect(mockResetCommandSubtitle).toHaveBeenCalledOnce();
});

test("publishes the confirmed mode after cycling", async () => {
  // Given
  const toast = stubControlWorkflow();
  vi.mocked(PodsControlCli.cycleListeningMode).mockResolvedValue("adaptive");
  // When
  await runCycleListeningModeCommand();
  // Then
  expect(PodsControlCli.getListeningMode).not.toHaveBeenCalled();
  expect(enabledListeningModes()).toEqual(["adaptive", "noise-cancellation", "transparency"]);
  expect(mockPublishCommandSubtitle).toHaveBeenCalledExactlyOnceWith("Adaptive ◑", {
    channel: "listening-mode",
    revision: "test-revision",
  });
  expect(vi.mocked(PodsControlCli.cycleListeningMode).mock.invocationCallOrder[0]).toBeLessThan(
    mockPublishCommandSubtitle.mock.invocationCallOrder[0],
  );
  expect(toast.setToSuccess).toHaveBeenCalledWith({
    titleOverride: "Set to Adaptive ◑",
  });
});

test.each([
  ["zero", { cycleOff: false, cycleTransparency: false, cycleAdaptive: false, cycleAnc: false }],
  ["one", { cycleOff: false, cycleTransparency: true, cycleAdaptive: false, cycleAnc: false }],
] as const)("rejects %s enabled listening modes before reading or writing", async (_count, preferences) => {
  // Given
  const toast = stubControlWorkflow();
  mockGetPreferenceValues.mockReturnValue(preferences as never);
  // When
  await runCycleListeningModeCommand();
  // Then
  expect(PodsControlCli.getListeningMode).not.toHaveBeenCalled();
  expect(PodsControlCli.cycleListeningMode).not.toHaveBeenCalled();
  expect(mockPublishCommandSubtitle).not.toHaveBeenCalled();
  expect(mockResetCommandSubtitle).not.toHaveBeenCalled();
  expect(toast.setToFailure).toHaveBeenCalledWith({
    error: expect.any(Error),
    action: {
      title: "Open Command Preferences",
      onAction: mockOpenCommandPreferences,
    },
  });
  expect(toast.setToSuccess).not.toHaveBeenCalled();
});

test("passes the enabled listening modes to the CLI", async () => {
  // Given
  stubControlWorkflow();
  mockGetPreferenceValues.mockReturnValue({
    cycleOff: false,
    cycleTransparency: true,
    cycleAdaptive: false,
    cycleAnc: true,
  } as never);
  vi.mocked(PodsControlCli.cycleListeningMode).mockResolvedValue("noise-cancellation");
  // When
  await runCycleListeningModeCommand();
  // Then
  expect(enabledListeningModes()).toEqual(["noise-cancellation", "transparency"]);
  expect(mockPublishCommandSubtitle).toHaveBeenCalledExactlyOnceWith("Noise Cancellation ●", {
    channel: "listening-mode",
    revision: "test-revision",
  });
});

test("publishes the confirmed state and offers command preferences when cycling is unsupported", async () => {
  // Given
  const toast = stubControlWorkflow();
  const error = new CliError("unsupported", {
    result: "error",
    device: "My AirPods Pro",
    listeningMode: "noise-cancellation",
  });
  vi.mocked(PodsControlCli.cycleListeningMode).mockRejectedValue(error);
  // When
  await runCycleListeningModeCommand();
  // Then
  expect(mockPublishCommandSubtitle).toHaveBeenCalledExactlyOnceWith("Noise Cancellation ●", {
    channel: "listening-mode",
    revision: "test-revision",
  });
  expect(toast.setToFailure).toHaveBeenCalledWith({
    error: expect.any(Error),
    action: {
      title: "Open Command Preferences",
      onAction: mockOpenCommandPreferences,
    },
  });
});

test("shows the general failure when cycling with Off enabled fails without a confirmed mode", async () => {
  // Given
  const toast = stubControlWorkflow();
  mockGetPreferenceValues.mockReturnValue({
    cycleOff: true,
    cycleTransparency: true,
    cycleAdaptive: false,
    cycleAnc: true,
  } as never);
  const error = new CliError("no-op");
  vi.mocked(PodsControlCli.cycleListeningMode).mockRejectedValue(error);
  // When
  await runCycleListeningModeCommand();
  // Then
  expect(mockPublishCommandSubtitle).not.toHaveBeenCalled();
  expect(mockResetCommandSubtitle).toHaveBeenCalledOnce();
  expect(toast.setToFailure).toHaveBeenCalledExactlyOnceWith({ error });
});

test("publishes the confirmed state after toggling", async () => {
  // Given
  const toast = stubControlWorkflow();
  // When
  await runToggleConversationAwarenessCommand();
  // Then
  expect(PodsControlCli.setConversationAwareness).toHaveBeenCalledWith("on");
  expect(mockPublishCommandSubtitle).toHaveBeenCalledExactlyOnceWith("On ●", {
    channel: "conversation-awareness",
    revision: "test-revision",
  });
  expect(vi.mocked(PodsControlCli.setConversationAwareness).mock.invocationCallOrder[0]).toBeLessThan(
    mockPublishCommandSubtitle.mock.invocationCallOrder[0],
  );
  expect(toast.setToSuccess).toHaveBeenCalledWith({ titleOverride: "Conversation Awareness On ●" });
});

test("publishes the confirmed state from a failed toggle", async () => {
  // Given
  const toast = stubControlWorkflow();
  const error = new CliError("no-op", {
    result: "error",
    device: "My AirPods Pro",
    conversationAwareness: "off",
  });
  vi.mocked(PodsControlCli.setConversationAwareness).mockRejectedValue(error);
  // When
  await runToggleConversationAwarenessCommand();
  // Then
  expect(mockPublishCommandSubtitle).toHaveBeenCalledExactlyOnceWith("Off ○̸", {
    channel: "conversation-awareness",
    revision: "test-revision",
  });
  expect(toast.setToFailure).toHaveBeenCalledWith({ error });
});

test("preserves unsupported-device feedback", async () => {
  // Given
  const toast = stubControlWorkflow();
  vi.mocked(PodsControlCli.getConversationAwareness).mockRejectedValue(new CliError("unsupported"));
  // When
  await runToggleConversationAwarenessCommand();
  // Then
  expect(mockPublishCommandSubtitle).not.toHaveBeenCalled();
  expect(mockResetCommandSubtitle).toHaveBeenCalledOnce();
  expect(toast.setToFailure).toHaveBeenCalledWith({
    titleOverride: "Conversation Awareness not supported",
    error: expect.any(Error),
  });
});

test("resets the subtitle when a toggle fails without a confirmed state", async () => {
  // Given
  stubControlWorkflow();
  vi.mocked(PodsControlCli.setConversationAwareness).mockRejectedValue(new CliError("no-op"));
  // When
  await runToggleConversationAwarenessCommand();
  // Then
  expect(mockPublishCommandSubtitle).not.toHaveBeenCalled();
  expect(mockResetCommandSubtitle).toHaveBeenCalledOnce();
});

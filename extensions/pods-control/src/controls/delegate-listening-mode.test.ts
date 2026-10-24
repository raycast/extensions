import { launchCommand, LaunchType } from "@raycast/api";
import { expect, vi, test } from "vitest";
import { isCliInstalled } from "../cli/discovery";
import { promptForCliInstallation } from "../setup/installation";
import { expectConsoleWarning } from "../test/console";
import { deferred } from "../test/fixtures/deferred";
import { fakeTimers } from "../test/fixtures/fake-timers";
import { setListeningMode } from "./delegate-listening-mode";
import { runSetListeningModeCommand } from "./listening-mode";

vi.mock("./listening-mode", () => ({
  runSetListeningModeCommand: vi.fn(),
}));

vi.mock("../cli/discovery", () => ({ isCliInstalled: vi.fn() }));

vi.mock("../setup/installation", () => ({ promptForCliInstallation: vi.fn() }));

const mockLaunchCommand = vi.mocked(launchCommand);

test("delegates a fixed set to Cycle with typed context", async () => {
  // Given
  vi.mocked(isCliInstalled).mockReturnValue(true);
  // When
  await setListeningMode("adaptive");
  // Then
  expect(mockLaunchCommand).toHaveBeenCalledWith({
    name: "cycle-listening-mode",
    type: LaunchType.UserInitiated,
    context: { operation: "set", mode: "adaptive" },
  });
  expect(promptForCliInstallation).not.toHaveBeenCalled();
  expect(runSetListeningModeCommand).not.toHaveBeenCalled();
});

test("uses the guarded CLI workflow when Cycle cannot be launched", async () => {
  // Given
  vi.mocked(isCliInstalled).mockReturnValue(true);
  const error = new Error("disabled");
  expectConsoleWarning("Could not delegate to Cycle Listening Mode; using the CLI fallback", error);
  mockLaunchCommand.mockRejectedValue(error);
  // When
  await setListeningMode("noise-cancellation");
  // Then
  expect(promptForCliInstallation).not.toHaveBeenCalled();
  expect(runSetListeningModeCommand).toHaveBeenCalledWith("noise-cancellation", { updateCycleSubtitle: false });
});

test.each(["noise-cancellation", "transparency", "adaptive", "off"] as const)(
  "owns missing-CLI setup for %s without delegating or starting a second installer",
  async (mode) => {
    // Given
    using timers = fakeTimers();
    vi.mocked(isCliInstalled).mockReturnValue(false);
    const installation = deferred<void>();
    vi.mocked(promptForCliInstallation).mockReturnValue(installation.promise);
    // When
    const running = setListeningMode(mode);
    await vi.advanceTimersByTimeAsync(6000);
    // Then
    expect(promptForCliInstallation).toHaveBeenCalledOnce();
    expect(mockLaunchCommand).not.toHaveBeenCalled();
    expect(runSetListeningModeCommand).not.toHaveBeenCalled();
    // When
    vi.mocked(isCliInstalled).mockReturnValue(true);
    installation.resolve();
    await running;
    // Then
    expect(mockLaunchCommand).not.toHaveBeenCalled();
    expect(runSetListeningModeCommand).not.toHaveBeenCalled();
    // When
    await setListeningMode(mode);
    // Then
    expect(mockLaunchCommand).toHaveBeenCalledExactlyOnceWith({
      name: "cycle-listening-mode",
      type: LaunchType.UserInitiated,
      context: { operation: "set", mode },
    });
    expect(promptForCliInstallation).toHaveBeenCalledOnce();
  },
);

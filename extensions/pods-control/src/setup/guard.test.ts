import { Clipboard, Keyboard, launchCommand, type Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { expect, vi, test } from "vitest";
import { isCliInstalled } from "../cli/discovery";
import { runWithCliGuard } from "./guard";
import { promptForCliInstallation } from "./installation";

vi.mock("./installation", () => ({ promptForCliInstallation: vi.fn() }));

vi.mock("../cli/discovery", () => ({
  isCliInstalled: vi.fn(),
}));

const mockIsCliInstalled = vi.mocked(isCliInstalled);

const mockClipboardCopy = vi.mocked(Clipboard.copy);

const mockLaunchCommand = vi.mocked(launchCommand);

const mockShowFailureToast = vi.mocked(showFailureToast);

test("runs the action when the CLI is installed", async () => {
  // Given
  mockIsCliInstalled.mockReturnValue(true);
  const onUnavailable = vi.fn();
  const perform = vi.fn().mockResolvedValue(undefined);
  // When
  await runWithCliGuard(perform, { onUnavailable });
  // Then
  expect(perform).toHaveBeenCalledOnce();
  expect(onUnavailable).not.toHaveBeenCalled();
  expect(mockLaunchCommand).not.toHaveBeenCalled();
});

test("offers setup without running the action, even if installation succeeds", async () => {
  // Given
  mockIsCliInstalled.mockReturnValue(false);
  const perform = vi.fn();
  const onUnavailable = vi.fn().mockResolvedValue(undefined);
  vi.mocked(promptForCliInstallation).mockImplementation(async () => {
    mockIsCliInstalled.mockReturnValue(true);
  });
  // When
  await runWithCliGuard(perform, { onUnavailable });
  // Then
  expect(onUnavailable).toHaveBeenCalledOnce();
  expect(promptForCliInstallation).toHaveBeenCalledOnce();
  expect(mockLaunchCommand).not.toHaveBeenCalled();
  expect(perform).not.toHaveBeenCalled();
  // When
  await runWithCliGuard(perform);
  // Then
  expect(perform).toHaveBeenCalledOnce();
});

test("shows a copyable failure toast when the action rejects unexpectedly", async () => {
  // Given
  mockIsCliInstalled.mockReturnValue(true);
  const error = new Error("boom");
  const perform = vi.fn().mockRejectedValue(error);
  // When
  await runWithCliGuard(perform);
  // Then
  expect(mockShowFailureToast).toHaveBeenCalledWith(error, {
    title: "Command failed",
    message: error.message,
    primaryAction: expect.objectContaining({
      title: "Copy Error",
      shortcut: Keyboard.Shortcut.Common.Copy,
    }),
  });
  const options = mockShowFailureToast.mock.calls[0][1];
  // When
  await options?.primaryAction?.onAction({} as Toast);
  // Then
  expect(mockClipboardCopy).toHaveBeenCalledWith(error.message);
});

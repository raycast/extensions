import { execFile } from "child_process";
import { accessSync, statSync } from "fs";
import { Clipboard, getPreferenceValues, showToast, type Toast } from "@raycast/api";
import { expect, vi, type Mock, test } from "vitest";
import { runCli } from "../cli/transport";
import { ToastManager } from "../feedback/toast-manager";
import { showCliFailure } from "./control-operation";
import type * as Fs from "fs";

vi.mock("child_process", () => ({
  execFile: vi.fn(),
}));

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof Fs>();
  return {
    ...actual,
    accessSync: vi.fn(),
    statSync: vi.fn(),
    constants: { ...actual.constants, X_OK: 1 },
  };
});

const mockExecFile = execFile as unknown as Mock;

test("shows the short message for a known CLI error and copies its diagnostics", async () => {
  // Given
  vi.mocked(getPreferenceValues).mockReturnValue({} as never);
  vi.mocked(statSync).mockReturnValue({ isFile: () => true } as never);
  vi.mocked(accessSync).mockImplementation(() => undefined);
  mockExecFile.mockImplementation((_file: string, _args: string[], _options: unknown, callback: Mock) => {
    const error = new Error("Command failed") as Error & { code?: number };
    error.code = 70;
    callback(
      error,
      JSON.stringify({ device: null, error: "read-error", result: "error" }),
      "IOBluetooth: read timed out\n",
    );
  });
  const toast = new ToastManager({ loading: "Reading...", success: "Read", failure: "Failed to read" });

  // When
  const error = await runCli(["listening-mode", "get"]).catch((reason: unknown) => reason);
  await showCliFailure(toast, error);

  // Then
  const options = vi.mocked(showToast).mock.calls[0][0] as unknown as Toast.Options;
  expect(options.message).toBe(
    "The CLI could not read status. Check that your AirPods or Beats are connected and try again.",
  );

  // When
  await options.primaryAction?.onAction({} as unknown as Toast);

  // Then
  expect(Clipboard.copy).toHaveBeenCalledWith(
    "The CLI could not read status. Check that your AirPods or Beats are connected and try again.\n\n" +
      "CLI diagnostics:\nExit status: 70\nstderr: IOBluetooth: read timed out",
  );
});

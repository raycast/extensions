import { confirmAlert, launchCommand, showToast } from "@raycast/api";
import { expect, vi, test } from "vitest";
import { isCliInstalled } from "../../cli/discovery";
import { installCliWithBrew } from "../../homebrew/commands";
import { detectCliSetup } from "../../setup/detection";
import { runWithCliGuard } from "../../setup/guard";
import { cliSetup, installedCliSetup } from "../fixtures/cli-setup";

vi.mock("../../homebrew/commands", () => ({ installCliWithBrew: vi.fn() }));

vi.mock("../../cli/discovery", () => ({ isCliInstalled: vi.fn() }));

vi.mock("../../setup/detection", () => ({ detectCliSetup: vi.fn() }));

test("opens the install alert when the CLI is missing and Homebrew is available", async () => {
  // Given
  vi.mocked(isCliInstalled).mockReturnValue(false);
  vi.mocked(confirmAlert).mockResolvedValue(true);
  vi.mocked(installCliWithBrew).mockResolvedValue(undefined);
  vi.mocked(detectCliSetup)
    .mockResolvedValueOnce(cliSetup())
    .mockResolvedValueOnce(cliSetup())
    .mockResolvedValue(installedCliSetup());
  const perform = vi.fn().mockResolvedValue(undefined);
  // When
  await runWithCliGuard(perform);
  // Then
  expect(confirmAlert).toHaveBeenCalledOnce();
  expect(launchCommand).not.toHaveBeenCalled();
  expect(installCliWithBrew).toHaveBeenCalledOnce();
  expect(perform).not.toHaveBeenCalled();
});

test("opens the CLI setup view when the CLI and Homebrew are missing", async () => {
  // Given
  vi.mocked(isCliInstalled).mockReturnValue(false);
  vi.mocked(confirmAlert).mockResolvedValue(true);
  vi.mocked(installCliWithBrew).mockResolvedValue(undefined);
  vi.mocked(detectCliSetup).mockResolvedValue(cliSetup({ state: "needs-homebrew", brewPath: null }));
  const perform = vi.fn().mockResolvedValue(undefined);
  // When
  await runWithCliGuard(perform);
  // Then
  expect(launchCommand).toHaveBeenCalledWith({ name: "manage-cli", type: "userInitiated" });
  expect(confirmAlert).not.toHaveBeenCalled();
  expect(showToast).not.toHaveBeenCalled();
  expect(installCliWithBrew).not.toHaveBeenCalled();
  expect(perform).not.toHaveBeenCalled();
});

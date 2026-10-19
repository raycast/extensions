import { launchCommand, open, showToast } from "@raycast/api";
import { expect, vi, test } from "vitest";
import { openCliSetup } from "./navigation";

test("offers installation instructions if the setup command is disabled, without retrying the launch", async () => {
  // Given
  vi.mocked(launchCommand).mockRejectedValueOnce(new Error("command disabled"));
  // When
  await openCliSetup();
  // Then
  expect(launchCommand).toHaveBeenCalledOnce();
  const toast = await vi.mocked(showToast).mock.results[0].value;
  // When
  await toast.primaryAction.onAction(toast);
  // Then
  expect(open).toHaveBeenCalledWith("https://github.com/raulgg/pods-control/blob/HEAD/README.md#install");
});

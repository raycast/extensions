import { LaunchType, type LaunchProps } from "@raycast/api";
import { expect, vi, test } from "vitest";
import main from "./pods-status";
import { runWithCliGuard } from "./setup/guard";
import { resetStatusSubtitles, runStatusRefresh } from "./status/refresh";

vi.mock("./status/refresh", () => ({
  resetStatusSubtitles: vi.fn(),
  runStatusRefresh: vi.fn(),
}));

vi.mock("./setup/guard", () => ({
  runWithCliGuard: vi.fn(async (perform: () => Promise<void>) => perform()),
}));

function props(launchType: LaunchType = LaunchType.UserInitiated): LaunchProps {
  return { launchType, arguments: undefined } as unknown as LaunchProps;
}

test("uses the interactive CLI guard and shows feedback for a user-initiated status refresh", async () => {
  // Given
  const launch = props();
  // When
  await main(launch);
  // Then
  expect(runWithCliGuard).toHaveBeenCalledWith(expect.any(Function), {
    onUnavailable: resetStatusSubtitles,
  });
  expect(runStatusRefresh).toHaveBeenCalledWith({ showFeedback: true });
});

test("runs silently in the background without opening setup", async () => {
  // Given
  const launch = props(LaunchType.Background);
  // When
  await main(launch);
  // Then
  expect(runStatusRefresh).toHaveBeenCalledWith({ showFeedback: false });
  expect(runWithCliGuard).not.toHaveBeenCalled();
  expect(resetStatusSubtitles).not.toHaveBeenCalled();
});

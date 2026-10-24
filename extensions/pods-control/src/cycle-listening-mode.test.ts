import { LaunchType, type LaunchProps } from "@raycast/api";
import { expect, vi, test } from "vitest";
import { runCycleListeningModeCommand, runSetListeningModeCommand } from "./controls/listening-mode";
import main from "./cycle-listening-mode";
import { runWithCliGuard } from "./setup/guard";
import { resetCommandSubtitle } from "./subtitles/coordination";
import { publishListeningModeSubtitle, refreshListeningModeSubtitle } from "./subtitles/feature-subtitles";
import type { SetListeningModeLaunchContext } from "./commands/launch-context";
import type { ListeningModeSubtitleRefreshContext } from "./commands/launch-context";

vi.mock("./subtitles/feature-subtitles", () => ({
  publishListeningModeSubtitle: vi.fn(),
  refreshListeningModeSubtitle: vi.fn(),
}));

vi.mock("./controls/listening-mode", () => ({
  runCycleListeningModeCommand: vi.fn(),
  runSetListeningModeCommand: vi.fn(),
}));

vi.mock("./setup/guard", () => ({
  runWithCliGuard: vi.fn(async (perform: () => Promise<void>) => perform()),
}));

vi.mock("./subtitles/coordination", () => ({
  resetCommandSubtitle: vi.fn(),
}));

type Props = LaunchProps<{
  launchContext?: SetListeningModeLaunchContext | ListeningModeSubtitleRefreshContext;
}>;

function props(
  launchContext?: SetListeningModeLaunchContext | ListeningModeSubtitleRefreshContext,
  launchType: LaunchType = LaunchType.UserInitiated,
): Props {
  return { launchType, arguments: undefined, launchContext } as unknown as Props;
}

test("preserves the current subtitle while starting a normal cycle", async () => {
  // Given
  const launch = props();
  // When
  await main(launch);
  // Then
  expect(refreshListeningModeSubtitle).not.toHaveBeenCalled();
  expect(resetCommandSubtitle).not.toHaveBeenCalled();
  expect(runWithCliGuard).toHaveBeenCalledOnce();
  expect(runWithCliGuard).toHaveBeenCalledWith(expect.any(Function), {
    onUnavailable: expect.any(Function),
  });
  expect(runCycleListeningModeCommand).toHaveBeenCalledOnce();
  expect(runSetListeningModeCommand).not.toHaveBeenCalled();
});

test("falls back to a read-only refresh for a background launch without refresh context", async () => {
  // Given
  const launch = props({ operation: "set", mode: "transparency" }, LaunchType.Background);
  // When
  await main(launch);
  // Then
  expect(refreshListeningModeSubtitle).toHaveBeenCalledOnce();
  expect(publishListeningModeSubtitle).not.toHaveBeenCalled();
  expect(runWithCliGuard).not.toHaveBeenCalled();
  expect(runCycleListeningModeCommand).not.toHaveBeenCalled();
  expect(runSetListeningModeCommand).not.toHaveBeenCalled();
});

test("publishes coordinator state during a background launch without reading or cycling", async () => {
  // Given
  const launch = props(
    { operation: "refresh-listening-mode-subtitle", mode: "noise-cancellation", revision: "read-revision" },
    LaunchType.Background,
  );
  // When
  await main(launch);
  // Then
  expect(publishListeningModeSubtitle).toHaveBeenCalledWith("noise-cancellation", "read-revision");
  expect(refreshListeningModeSubtitle).not.toHaveBeenCalled();
  expect(runWithCliGuard).not.toHaveBeenCalled();
  expect(runCycleListeningModeCommand).not.toHaveBeenCalled();
  expect(runSetListeningModeCommand).not.toHaveBeenCalled();
});

test("resets the coordinator-owned subtitle during a background launch", async () => {
  // Given
  const launch = props(
    { operation: "refresh-listening-mode-subtitle", mode: null, revision: "read-revision" },
    LaunchType.Background,
  );
  // When
  await main(launch);
  // Then
  expect(publishListeningModeSubtitle).toHaveBeenCalledWith(null, "read-revision");
  expect(runCycleListeningModeCommand).not.toHaveBeenCalled();
  expect(runSetListeningModeCommand).not.toHaveBeenCalled();
});

test("performs a single delegated set without cycling", async () => {
  // Given
  const launch = props({ operation: "set", mode: "transparency" });
  // When
  await main(launch);
  // Then
  expect(resetCommandSubtitle).not.toHaveBeenCalled();
  expect(runSetListeningModeCommand).toHaveBeenCalledWith("transparency", { updateCycleSubtitle: true });
  expect(runCycleListeningModeCommand).not.toHaveBeenCalled();
});

test("rejects invalid programmatic context without changing a mode", async () => {
  // Given
  const invalid = { operation: "set", mode: "future" } as unknown as SetListeningModeLaunchContext;
  // When
  const result = main(props(invalid));
  // Then
  await expect(result).rejects.toThrow("invalid launch context");
  expect(resetCommandSubtitle).toHaveBeenCalledWith({ channel: "listening-mode" });
  expect(runCycleListeningModeCommand).not.toHaveBeenCalled();
  expect(runSetListeningModeCommand).not.toHaveBeenCalled();
});

test("never treats subtitle-refresh context as a user-initiated set", async () => {
  // Given
  const launch = props({ operation: "refresh-listening-mode-subtitle", mode: "adaptive", revision: "read-revision" });
  // When
  const result = main(launch);
  // Then
  await expect(result).rejects.toThrow("invalid launch context");
  expect(resetCommandSubtitle).toHaveBeenCalledWith({ channel: "listening-mode" });
  expect(runCycleListeningModeCommand).not.toHaveBeenCalled();
  expect(runSetListeningModeCommand).not.toHaveBeenCalled();
});

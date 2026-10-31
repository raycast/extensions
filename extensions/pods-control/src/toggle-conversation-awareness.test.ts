import { LaunchType, type LaunchProps } from "@raycast/api";
import { expect, vi, test } from "vitest";
import { runToggleConversationAwarenessCommand } from "./controls/conversation-awareness";
import { runWithCliGuard } from "./setup/guard";
import { resetCommandSubtitle } from "./subtitles/coordination";
import {
  publishConversationAwarenessSubtitle,
  refreshConversationAwarenessSubtitle,
} from "./subtitles/feature-subtitles";
import main from "./toggle-conversation-awareness";
import type { ConversationAwarenessSubtitleRefreshContext } from "./commands/launch-context";

vi.mock("./subtitles/feature-subtitles", () => ({
  publishConversationAwarenessSubtitle: vi.fn(),
  refreshConversationAwarenessSubtitle: vi.fn(),
}));

vi.mock("./controls/conversation-awareness", () => ({
  runToggleConversationAwarenessCommand: vi.fn(),
}));

vi.mock("./setup/guard", () => ({
  runWithCliGuard: vi.fn(async (perform: () => Promise<void>) => perform()),
}));

vi.mock("./subtitles/coordination", () => ({
  resetCommandSubtitle: vi.fn(),
}));

type Props = LaunchProps<{ launchContext?: ConversationAwarenessSubtitleRefreshContext }>;

function props(
  launchType: LaunchType = LaunchType.UserInitiated,
  launchContext?: ConversationAwarenessSubtitleRefreshContext,
): Props {
  return { launchType, arguments: undefined, launchContext } as unknown as Props;
}

test("routes a foreground toggle through the CLI guard without resetting current status", async () => {
  // Given
  const launch = props();
  // When
  await main(launch);
  // Then
  expect(refreshConversationAwarenessSubtitle).not.toHaveBeenCalled();
  expect(resetCommandSubtitle).not.toHaveBeenCalled();
  expect(runWithCliGuard).toHaveBeenCalledWith(runToggleConversationAwarenessCommand, {
    onUnavailable: expect.any(Function),
  });
  expect(runToggleConversationAwarenessCommand).toHaveBeenCalledOnce();
});

test("only refreshes the subtitle during a background launch", async () => {
  // Given
  const launch = props(LaunchType.Background);
  // When
  await main(launch);
  // Then
  expect(refreshConversationAwarenessSubtitle).toHaveBeenCalledOnce();
  expect(publishConversationAwarenessSubtitle).not.toHaveBeenCalled();
  expect(runWithCliGuard).not.toHaveBeenCalled();
  expect(runToggleConversationAwarenessCommand).not.toHaveBeenCalled();
});

test("publishes coordinator state during a background launch without reading or toggling", async () => {
  // Given
  const launch = props(LaunchType.Background, {
    operation: "refresh-conversation-awareness-subtitle",
    state: "on",
    revision: "read-revision",
  });
  // When
  await main(launch);
  // Then
  expect(publishConversationAwarenessSubtitle).toHaveBeenCalledWith("on", "read-revision");
  expect(refreshConversationAwarenessSubtitle).not.toHaveBeenCalled();
  expect(runWithCliGuard).not.toHaveBeenCalled();
  expect(runToggleConversationAwarenessCommand).not.toHaveBeenCalled();
});

test("resets the coordinator-owned subtitle during a background launch", async () => {
  // Given
  const launch = props(LaunchType.Background, {
    operation: "refresh-conversation-awareness-subtitle",
    state: null,
    revision: "read-revision",
  });
  // When
  await main(launch);
  // Then
  expect(publishConversationAwarenessSubtitle).toHaveBeenCalledWith(null, "read-revision");
  expect(runToggleConversationAwarenessCommand).not.toHaveBeenCalled();
});

test("rejects user-initiated refresh context without toggling", async () => {
  // Given
  const launch = props(LaunchType.UserInitiated, {
    operation: "refresh-conversation-awareness-subtitle",
    state: "off",
    revision: "read-revision",
  });
  // When
  const result = main(launch);
  // Then
  await expect(result).rejects.toThrow("invalid launch context");
  expect(resetCommandSubtitle).toHaveBeenCalledWith({ channel: "conversation-awareness" });
  expect(runWithCliGuard).not.toHaveBeenCalled();
  expect(runToggleConversationAwarenessCommand).not.toHaveBeenCalled();
});

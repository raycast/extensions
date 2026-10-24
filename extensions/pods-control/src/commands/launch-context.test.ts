import { expect, test } from "vitest";
import {
  modeFromLaunchContext,
  listeningModeFromSubtitleRefreshContext,
  conversationAwarenessFromSubtitleRefreshContext,
} from "./launch-context";

test.each([
  [{ operation: "refresh-listening-mode-subtitle", mode: "adaptive" }, "adaptive"],
  [{ operation: "refresh-listening-mode-subtitle", mode: null }, null],
] as const)("parses listening mode refresh context %j", (context, expected) => {
  // Given the input supplied by this case
  // When
  const result = listeningModeFromSubtitleRefreshContext(context);
  // Then
  expect(result).toBe(expected);
});

test.each([
  [{ operation: "refresh-conversation-awareness-subtitle", state: "off" }, "off"],
  [{ operation: "refresh-conversation-awareness-subtitle", state: null }, null],
] as const)("parses Conversation Awareness refresh context %j", (context, expected) => {
  // Given the input supplied by this case
  // When
  const result = conversationAwarenessFromSubtitleRefreshContext(context);
  // Then
  expect(result).toBe(expected);
});

test.each([
  undefined,
  null,
  {},
  { operation: "set", mode: "noise-cancellation" },
  { operation: "refresh-listening-mode-subtitle", mode: "future" },
])("rejects invalid listening mode refresh context %j", (context) => {
  // Given the input supplied by this case
  // When
  const result = listeningModeFromSubtitleRefreshContext(context);
  // Then
  expect(result).toBeUndefined();
});

test.each([
  undefined,
  null,
  {},
  { operation: "toggle", state: "on" },
  { operation: "refresh-conversation-awareness-subtitle", state: "future" },
])("rejects invalid Conversation Awareness refresh context %j", (context) => {
  // Given the input supplied by this case
  // When
  const result = conversationAwarenessFromSubtitleRefreshContext(context);
  // Then
  expect(result).toBeUndefined();
});

test.each([
  [{ operation: "set", mode: "off" }, "off"],
  [{ operation: "set", mode: "noise-cancellation" }, "noise-cancellation"],
  [{ operation: "set", mode: "transparency" }, "transparency"],
  [{ operation: "set", mode: "adaptive" }, "adaptive"],
] as const)("accepts valid launch context %j", (context, mode) => {
  // Given the input supplied by this case
  // When
  const result = modeFromLaunchContext(context);
  // Then
  expect(result).toBe(mode);
});

test.each([
  undefined,
  null,
  {},
  { operation: "cycle", mode: "noise-cancellation" },
  { operation: "set", mode: "future" },
])("rejects invalid launch context %j", (context) => {
  // Given the input supplied by this case
  // When
  const result = modeFromLaunchContext(context);
  // Then
  expect(result).toBeNull();
});

import { expect, test } from "vitest";
import {
  conversationAwarenessHud,
  conversationAwarenessSubtitle,
  formatStatusSubtitle,
  listeningModeHud,
  listeningModeSubtitle,
} from "./presentation";

test.each([
  ["off", "Off ○̸", "Set to Off ○̸"],
  ["transparency", "Transparency ○", "Set to Transparency ○"],
  ["adaptive", "Adaptive ◑", "Set to Adaptive ◑"],
  ["noise-cancellation", "Noise Cancellation ●", "Set to Noise Cancellation ●"],
] as const)("formats %s listening mode", (mode, subtitle, hud) => {
  // Given the input supplied by this case
  // When
  const result = listeningModeSubtitle(mode);
  // Then
  expect(result).toBe(subtitle);
  // When
  const result2 = listeningModeHud(mode);
  // Then
  expect(result2).toBe(hud);
});

test.each([
  ["on", "On ●", "Conversation Awareness On ●"],
  ["off", "Off ○̸", "Conversation Awareness Off ○̸"],
] as const)("formats Conversation Awareness %s", (state, subtitle, hud) => {
  // Given the input supplied by this case
  // When
  const result = conversationAwarenessSubtitle(state);
  // Then
  expect(result).toBe(subtitle);
  // When
  const result2 = conversationAwarenessHud(state);
  // Then
  expect(result2).toBe(hud);
});

test.each([
  [{ listeningMode: "noise-cancellation", conversationAwareness: "on" }, "Noise Cancellation ● · CA ●"],
  [{ listeningMode: "transparency", conversationAwareness: "off" }, "Transparency ○ · CA ○̸"],
  [{ listeningMode: "adaptive", conversationAwareness: null }, "Adaptive ◑"],
  [{ listeningMode: null, conversationAwareness: "on" }, "CA ●"],
  [{ listeningMode: null, conversationAwareness: "off" }, "CA ○̸"],
  [{ listeningMode: "off", conversationAwareness: null }, "Off ○̸"],
  [{ listeningMode: null, conversationAwareness: null }, null],
] as const)("formats a combined status subtitle %j", (status, expected) => {
  // Given the input supplied by this case
  // When
  const result = formatStatusSubtitle(status);
  // Then
  expect(result).toBe(expected);
});

import { describe, expect, it } from "vitest";
import { REASON_CODES, type VoiceAction } from "../domain/types";
import { BEST_EFFORT_NOTE, resolveMessage } from "./messages";

/**
 * Message-safety tests — the core of the best-effort trust model (Phase 6/7). They assert that no
 * message anywhere in the catalog implies a confirmed voice state.
 */

const ACTIONS: VoiceAction[] = ["toggleMute", "toggleDeafen"];

// Words that would imply a confirmed resulting state rather than an action that was sent.
const FORBIDDEN_STATE_WORDS = [
  "muted",
  "unmuted",
  "deafened",
  "undeafened",
  "you are now",
  "you're now",
  "is now",
  "successfully muted",
];

function allMessages(): string[] {
  const messages: string[] = [BEST_EFFORT_NOTE];
  for (const code of REASON_CODES) {
    for (const action of ACTIONS) {
      messages.push(resolveMessage(code, action));
    }
  }
  return messages;
}

describe("message catalog", () => {
  it("has a non-empty message for every reason code and action", () => {
    for (const code of REASON_CODES) {
      for (const action of ACTIONS) {
        const message = resolveMessage(code, action);
        expect(message, `${code}/${action}`).toBeTruthy();
        expect(message.trim().length, `${code}/${action}`).toBeGreaterThan(0);
      }
    }
  });

  it("never uses confirmed-state wording in ANY message (no outcome implies a state changed)", () => {
    for (const message of allMessages()) {
      const lower = message.toLowerCase();
      for (const forbidden of FORBIDDEN_STATE_WORDS) {
        expect(lower.includes(forbidden), `message must not imply confirmed state ("${forbidden}"): "${message}"`).toBe(
          false,
        );
      }
    }
  });

  it("uses best-effort 'sent' wording for the success reason code", () => {
    expect(resolveMessage("shortcutDispatched", "toggleMute").toLowerCase()).toContain("sent");
    expect(resolveMessage("shortcutDispatched", "toggleDeafen").toLowerCase()).toContain("sent");
  });

  it("includes the relevant action label in action-oriented messages", () => {
    expect(resolveMessage("shortcutDispatched", "toggleMute").toLowerCase()).toContain("mute");
    expect(resolveMessage("shortcutDispatched", "toggleDeafen").toLowerCase()).toContain("deafen");
  });
});

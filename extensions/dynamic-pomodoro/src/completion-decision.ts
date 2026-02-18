const COMPLETION_DECISION_KEY = "timer-needs-completion-decision-v1";

declare function require(name: "@raycast/api"): typeof import("@raycast/api");

export async function markCompletionDecisionPending(): Promise<void> {
  try {
    const { LocalStorage } = require("@raycast/api");
    await LocalStorage.setItem(COMPLETION_DECISION_KEY, "1");
  } catch {
    // Decision flag should never break timer flow.
  }
}

export async function clearCompletionDecisionPending(): Promise<void> {
  try {
    const { LocalStorage } = require("@raycast/api");
    await LocalStorage.removeItem(COMPLETION_DECISION_KEY);
  } catch {
    // Decision flag should never break timer flow.
  }
}

export async function isCompletionDecisionPending(): Promise<boolean> {
  try {
    const { LocalStorage } = require("@raycast/api");
    const value = await LocalStorage.getItem<string>(COMPLETION_DECISION_KEY);
    return value === "1";
  } catch {
    return false;
  }
}

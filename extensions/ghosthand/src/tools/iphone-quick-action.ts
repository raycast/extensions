import type { Tool } from "@raycast/api";
import { client } from "../lib/ghosthand-client";
import { performAiAction } from "../lib/ai-operations";

type Input = {
  /** Exact phoneId returned by list-iphones. */
  phoneId: string;
  /** One explicitly requested action. press-enter is separate from typing and may submit or send. */
  action: "home" | "scroll-up" | "scroll-down" | "lock" | "mute" | "unmute" | "type-text" | "tap-text" | "press-enter";
  /** Required for type-text or tap-text. Typing supports printable US-ASCII only; no newlines, tabs, secrets, or passcodes. */
  text?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message:
    input.action === "press-enter" || input.action === "tap-text"
      ? "Perform this iPhone action? It may send a message, submit a form, delete content, or make a purchase depending on the current screen. Confirm only the action you intend."
      : input.action === "lock"
        ? "Lock this iPhone? You will need to unlock it by hand before viewing the screen again."
        : "Perform this direct action on the selected iPhone? Typing does not press Enter.",
  info: [
    { name: "iPhone ID", value: input.phoneId },
    { name: "Action", value: input.action },
    { name: "Text", value: input.text },
  ],
});

/** Perform one confirmed local action. Never retry an uncertain result or use text entry for passcodes. */
export default async function tool(input: Input) {
  return performAiAction(client, input);
}

import { Tool } from "@raycast/api";
import { setStatus } from "../api/status";

type Input = {
  /** The status message text. */
  message: string;
  /**
   * Optional absolute expiry as an ISO 8601 timestamp, preferably in UTC
   * (e.g. "2026-06-28T17:00:00Z"). Omit for a status that never expires.
   */
  expiry?: string;
  /**
   * Whether to also show the status above the compose box when people message
   * or @mention the user ("show when people message me"). Defaults to true.
   */
  pinned?: boolean;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: "Set your Microsoft Teams status message?",
  info: [
    { name: "Message", value: input.message },
    { name: "Expiry", value: input.expiry ?? "Never" },
    { name: "Show when people message me", value: (input.pinned ?? true) ? "Yes" : "No" },
  ],
});

/**
 * Sets the signed-in user's Microsoft Teams status message.
 */
export default async function (input: Input) {
  let expiry: Date | null = null;
  if (input.expiry) {
    expiry = new Date(input.expiry);
    if (isNaN(expiry.getTime())) {
      throw new Error(`Invalid expiry timestamp: "${input.expiry}". Provide an ISO 8601 date-time.`);
    }
  }
  const pinned = input.pinned ?? true;
  await setStatus(input.message, pinned, expiry);
  return expiry
    ? `Set status message to "${input.message}" (expires ${expiry.toISOString()})`
    : `Set status message to "${input.message}" (no expiry)`;
}

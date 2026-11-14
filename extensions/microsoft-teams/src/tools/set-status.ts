import { Tool } from "@raycast/api";
import { setStatus } from "../api/status";

type Input = {
  /** Status message to show in Microsoft Teams. */
  message: string;
  /** Whether to show the status above the compose box when people message or mention the user. */
  pinned?: boolean;
  /** Optional ISO 8601 date and time at which the status should be cleared. */
  expiresAt?: string;
};

function parseExpiry(expiresAt?: string) {
  if (!expiresAt) {
    return undefined;
  }

  const expiry = new Date(expiresAt);
  if (Number.isNaN(expiry.getTime())) {
    throw new Error("The status expiration must be a valid ISO 8601 date and time");
  }
  if (expiry.getTime() <= Date.now()) {
    throw new Error("The status expiration must be in the future");
  }
  return expiry;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: "Set your Microsoft Teams status message?",
    info: [
      { name: "Message", value: input.message },
      { name: "Show When Messaged", value: input.pinned ? "Yes" : "No" },
      ...(input.expiresAt ? [{ name: "Expires", value: input.expiresAt }] : []),
    ],
  };
};

export default async function tool(input: Input) {
  const message = input.message.trim();
  if (!message) {
    throw new Error("A status message is required");
  }
  if (message.length > 280) {
    throw new Error("The status message cannot be longer than 280 characters");
  }

  await setStatus(message, input.pinned ?? false, parseExpiry(input.expiresAt));
  return "Updated the Microsoft Teams status message";
}

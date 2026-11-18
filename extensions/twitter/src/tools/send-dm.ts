import { Tool } from "@raycast/api";
import { clientV2 } from "../v2/lib/twitterapi_v2";

type Input = {
  /** One numeric X user ID for a 1:1 DM, or multiple numeric IDs to create a group. */
  recipientUserIds: string[];
  /** Exact private message text. Optional only when mediaPath is supplied. */
  text?: string;
  /** Absolute local path to one image, GIF, or video attachment. */
  mediaPath?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: input.recipientUserIds.length === 1 ? "Send this direct message on X?" : "Create this X group conversation?",
  info: [
    { name: "Recipients", value: input.recipientUserIds.join(", ") },
    { name: "Message", value: input.text?.trim() || "Media only" },
    { name: "Media", value: input.mediaPath ?? "None" },
  ],
});

/** Send a user-confirmed 1:1 or group direct message. Never use for unsolicited outreach. */
export default async function sendDm(input: Input) {
  const result = await clientV2.sendDirectMessage(input.recipientUserIds, input.text ?? "", input.mediaPath);
  return { sent: true, ...result };
}

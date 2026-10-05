import { Tool } from "@raycast/api";

import { sendMessage } from "../helpers";

type Input = {
  /**
   * Stable chat GUID returned by search-chats. Prefer this for existing chats, especially groups.
   */
  chat_guid?: string;
  /**
   * Contact phone number/email or legacy chat identifier. Required when chat_guid is unavailable.
   */
  chat_identifier?: string;
  /**
   * The display name of the contact or the group chat name
   */
  displayName: string;
  /**
   * The phone number of the contact. Not relevant for group chats.
   */
  phoneNumber?: string;
  /**
   * The group name of the group chat. Not relevant for individual chats.
   */
  group_name?: string;
  /**
   * The service name of the message
   */
  service_name: "iMessage" | "SMS" | "auto";
  /**
   * The text of the message
   */
  text: string;
};

export default async function (input: Input) {
  if (!input.chat_guid && !input.chat_identifier) {
    throw new Error("A chat_guid or chat_identifier is required.");
  }

  const result = await sendMessage({
    address: input.chat_identifier ?? input.chat_guid ?? "",
    text: input.text,
    service_name: input.service_name,
    group_name: input.group_name,
    chat_guid: input.chat_guid,
  });
  if (result !== "Success") throw new Error(result.replace(/^Error:\s*/, ""));
  return "Message sent";
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const info = [
    { name: "Name", value: input.displayName },
    { name: "Text", value: input.text },
  ];

  if (input.phoneNumber) {
    info.push({ name: "Phone Number", value: input.phoneNumber });
  }

  if (input.chat_guid) {
    info.push({ name: "Chat", value: input.chat_guid });
  } else if (input.chat_identifier) {
    info.push({ name: "Recipient", value: input.chat_identifier });
  }

  return { info };
};

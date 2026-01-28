import { Tool } from "@raycast/api";

import { sendMessage } from "../helpers";

type Input = {
  /**
   * The chat identifier of the contact or the group chat identifier
   */
  chat_identifier: string;
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
  service_name: "iMessage" | "SMS";
  /**
   * The text of the message
   */
  text: string;
};

export default async function (input: Input) {
  await sendMessage({
    address: input.chat_identifier,
    text: input.text,
    service_name: input.service_name,
    group_name: input.group_name,
  });
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

  return { info };
};

import { Tool } from "@raycast/api";
import { saveChat } from "../services/saveChat";
import { Cache } from "@raycast/api";

type Input = {
  /**
   * The name of the person
   */
  name: string;
  /**
   * The phone number
   */
  phone: string;
  /**
   * Whether the chat should be pinned
   */
  pinned?: boolean;
};

/**
 * Add a new WhatsApp chat
 */
export default async function (input: Input) {
  const cache = new Cache();
  const chats = cache.get("whatsapp-chats") || "[]";
  await saveChat({
    chat: {
      name: input.name,
      phone: input.phone,
      pinned: input.pinned || false,
    },
    chats: JSON.parse(chats),
    setChats: (chats) => cache.set("whatsapp-chats", JSON.stringify(chats)),
  });
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: `Do you want to add "${input.name}" to your chats?`,
    info: [
      {
        name: "Name",
        value: input.name,
      },
      {
        name: "Phone",
        value: input.phone,
      },
      {
        name: "Pinned",
        value: input.pinned ? "Yes" : "No",
      },
    ],
  };
};

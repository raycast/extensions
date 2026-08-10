import { Tool, Cache } from "@raycast/api";
import { saveWhatsappGroup } from "../services/saveWhatsappGroup";

type Input = {
  /**
   * The name of the group
   */
  name: string;
  /**
   * The group code
   */
  groupCode: string;
  /**
   * Whether the chat should be pinned
   */
  pinned?: boolean;
};

/**
 * Add an existing WhatsApp group
 */
export default async function (input: Input) {
  const cache = new Cache();
  const chats = cache.get("whatsapp-chats") || "[]";
  await saveWhatsappGroup({
    chat: {
      name: input.name,
      groupCode: input.groupCode,
      pinned: input.pinned || false,
    },
    chats: JSON.parse(chats),
    setChats: (chats) => cache.set("whatsapp-chats", JSON.stringify(chats)),
  });
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: `Do you want to add "${input.name}" to your groups?`,
    info: [
      {
        name: "Name",
        value: input.name,
      },
      {
        name: "Group Code",
        value: input.groupCode,
      },
      {
        name: "Pinned",
        value: input.pinned ? "Yes" : "No",
      },
    ],
  };
};

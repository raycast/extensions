import { isGroupChat, WhatsAppChat, GroupChat } from "../utils/types";
import { nanoid as randomId } from "nanoid";

interface SaveWhatsappGroupProps {
  chat: Omit<GroupChat, "id"> & { id?: string };
  chats: WhatsAppChat[];
  setChats: (chats: WhatsAppChat[]) => void;
}

export async function saveWhatsappGroup({ chat, chats, setChats }: SaveWhatsappGroupProps) {
  const isCreation = !chat.id;

  if (!chat.groupCode) {
    throw new Error("Group Code is required");
  }

  const chatToSave: WhatsAppChat = {
    id: chat.id || randomId(),
    name: chat.name,
    pinned: !!chat.pinned,
    groupCode: chat.groupCode,
  } as GroupChat;

  const doesGroupCodeAlreadyExist = chats.filter(isGroupChat).some((c) => c.groupCode === chat.groupCode);

  if (isCreation && doesGroupCodeAlreadyExist) {
    throw new Error("Chat already exists");
  }

  if (isCreation) {
    setChats([...chats, chatToSave]);
  } else {
    const newChats = chats.map((c) => {
      if (c.id === chatToSave.id) {
        return chatToSave;
      }
      return c;
    });
    setChats(newChats);
  }
}

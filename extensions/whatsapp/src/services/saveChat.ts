import { isPhoneChat, WhatsAppChat, PhoneChat } from "../utils/types";
import { phone as parsePhone } from "phone";
import { nanoid as randomId } from "nanoid";

interface SaveChatProps {
  chat: Omit<PhoneChat, "id"> & { id?: string };
  chats: WhatsAppChat[];
  setChats: (chats: WhatsAppChat[]) => void;
}

export async function saveChat({ chat, chats, setChats }: SaveChatProps) {
  const phoneInformation = parsePhone(chat.phone);

  const isCreation = !chat.id;

  if (!phoneInformation.isValid) {
    throw new Error("Phone number is invalid");
  }

  const chatToSave: WhatsAppChat = {
    id: chat.id || randomId(),
    name: chat.name,
    pinned: !!chat.pinned,
    phone: phoneInformation.phoneNumber,
  } as PhoneChat;

  const doesPhoneNumberAlreadyExist = chats
    .filter(isPhoneChat)
    .some((chat) => chat.phone === phoneInformation.phoneNumber);

  if (isCreation && doesPhoneNumberAlreadyExist) {
    throw new Error("Chat already exists");
  }

  if (isCreation) {
    setChats([...chats, chatToSave]);
  } else {
    const newChats = chats.map((chat) => {
      if (chat.id === chatToSave.id) {
        return chatToSave;
      }
      return chat;
    });
    setChats(newChats);
  }
}

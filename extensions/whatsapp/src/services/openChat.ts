import { open, Cache } from "@raycast/api";
import { WhatsAppChat, isPhoneChat } from "../utils/types";

interface OpenChatProps {
  chatName: string;
  message?: string;
  openIn?: "app" | "web";
}

function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  const longerLength = longer.length;
  if (longerLength == 0) {
    return 1.0;
  }
  return (
    (longerLength -
      longer.split("").reduce((count, letter, index) => {
        return shorter[index] === letter ? count : count + 1;
      }, 0)) /
    longerLength
  );
}

export async function openChat({ chatName, message = "", openIn = "web" }: OpenChatProps) {
  const cache = new Cache();
  const chatsString = cache.get("whatsapp-chats") || "[]";
  const chats: WhatsAppChat[] = JSON.parse(chatsString);

  let bestMatch: WhatsAppChat | undefined;
  let bestScore = 0;

  for (const chat of chats) {
    const score = calculateSimilarity(chatName.toLowerCase(), chat.name.toLowerCase());
    if (score > bestScore) {
      bestScore = score;
      bestMatch = chat;
    }
  }

  if (!bestMatch) {
    throw new Error("Chat not found");
  }

  const handleOpen = (chat: WhatsAppChat) => {
    const newChats = chats.map((c) => {
      if (c.id === chat.id) {
        return { ...c, lastOpened: Date.now() };
      }
      return c;
    });
    cache.set("whatsapp-chats", JSON.stringify(newChats));
  };

  handleOpen(bestMatch);

  let url: string;
  if (isPhoneChat(bestMatch)) {
    const phone = bestMatch.phone.replace(/[^D]/, "");
    const text = encodeURIComponent(message);
    const appUrl = `whatsapp://send?phone=${phone}&text=${text}`;
    const webUrl = `https://web.whatsapp.com/send?phone=${phone}&text=${text}`;
    url = openIn === "app" ? appUrl : webUrl;
  } else {
    const appUrl = `whatsapp://chat?code=${bestMatch.groupCode}`;
    url = appUrl;
  }

  await open(url);
}

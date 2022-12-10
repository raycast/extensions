import fetch from "node-fetch";
import { ConversationItem } from "../type";

type ConversationData = {
  avatarUrl: string;
  items: ConversationItem[];
};

export const shareConversation = async (conversationData: ConversationData) => {
  const data = await fetch("https://chatgpt-share.vercel.app/api/save", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://chat.openai.com" },
    body: JSON.stringify(conversationData),
  }).then((res: any) => res.json());

  const { id } = data;
  const url = `https://shareg.pt/${id}`;

  return {
    id,
    url,
  };
};

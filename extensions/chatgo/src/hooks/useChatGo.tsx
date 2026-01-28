import { useState } from "react";
import ChatGoAPi from "../utils/chatGoApi";

export const useChatGo = () => {
  const [chatGo] = useState(() => {
    return new ChatGoAPi();
  });
  return chatGo;
};

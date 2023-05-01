// import { getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import ChatGoAPi from "../utils/chatGoApi";

export const useChatGo = () => {
  const [chatGo] = useState(() => {
    // const email = getPreferenceValues<{ email: string }>().email;
    return new ChatGoAPi();
  });
  return chatGo;
};

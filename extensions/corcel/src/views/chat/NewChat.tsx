import { useEffect, useState } from "react";

import ChatTemplate from "../chat/ChatTemplate";
import { Chat, generateChatFromQuestion, putNewChatInStorage } from "../../lib/chat";

const NewChat: React.FC<{ prompt: string }> = ({ prompt }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [chat, setChat] = useState<Chat | undefined>();

  useEffect(() => {
    if (prompt) {
      putNewChatInStorage(generateChatFromQuestion(prompt)).then((chat) => {
        setChat(chat);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  return <ChatTemplate chat={chat} isLoading={isLoading} />;
};

export default NewChat;

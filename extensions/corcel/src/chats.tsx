import { useState } from "react";
import Chats from "./views/Chats";
import { ChatId } from "./lib/chat";
import Chat from "./views/chat/Chat";

export default function Command() {
  const [selectedChatId, setSelectedChatId] = useState<null | ChatId>(null);

  const onListItemSelect = (id: ChatId) => {
    setSelectedChatId(id);
  };

  if (selectedChatId) {
    return <Chat chatId={selectedChatId} />;
  }

  return <Chats onListItemSelect={onListItemSelect} />;
}

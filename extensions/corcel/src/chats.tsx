import { useState } from "react";
import Chats from "./views/Chats";
import { ChatId } from "./lib/chat";
import ExistingChat from "./views/chat/ExistingChat";

export default function Command() {
  const [selectedChatId, setSelectedChatId] = useState<null | ChatId>(null);

  const onListItemSelect = (id: ChatId) => {
    setSelectedChatId(id);
  };

  // TODO - This causes the navigation context to be lost. Revisit this
  if (selectedChatId) {
    return <ExistingChat chatId={selectedChatId} />;
  }

  return <Chats onListItemSelect={onListItemSelect} />;
}

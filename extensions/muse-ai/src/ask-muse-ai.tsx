import { useConversations } from "./hooks/useConversations";
import { ConversationListView } from "./components/ConversationListView";

export default function Command() {
  const {
    conversations,
    isLoading: isLoadingConversations,
    addConversation,
    updateConversation,
    deleteConversation,
    deleteAllConversations,
  } = useConversations();

  return (
    <ConversationListView
      conversations={conversations}
      isLoading={isLoadingConversations}
      addConversation={addConversation}
      updateConversation={updateConversation}
      deleteConversation={deleteConversation}
      deleteAllConversations={deleteAllConversations}
    />
  );
}

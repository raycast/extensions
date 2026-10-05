import { useConversations } from "./ask/useConversations";
import { ConversationListView } from "./ask/ConversationListView";

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

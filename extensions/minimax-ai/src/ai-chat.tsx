import { useState, useCallback } from "react";
import { Alert, confirmAlert } from "@raycast/api";
import { useChat } from "./hooks/useChat";
import { useChatStore } from "./hooks/useChatStore";
import { ChatView } from "./components/ChatView";
import { Message } from "./providers/base";

export default function AIChat() {
  const {
    isLoaded,
    conversations,
    currentId,
    currentConversation,
    setCurrentId,
    addMessage,
    createConversation,
    deleteConversation,
  } = useChatStore();

  const { streamingContent, isLoading, sendMessage } = useChat();
  const [searchText, setSearchText] = useState("");
  const [selectionTrigger, setSelectionTrigger] = useState(0);

  const handleSubmit = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      let convId = currentId;

      // Create conversation if it's a new chat
      if (!convId) {
        convId = await createConversation(text);
        await setCurrentId(convId);
      }

      // Add user message to storage
      const userMessage: Message = { role: "user", content: text.trim() };
      await addMessage(convId, userMessage);

      // Build messages array for API call
      const currentMessages = currentConversation?.messages ?? [];
      const allMessages = [...currentMessages, userMessage];

      // Send to API
      const response = await sendMessage(allMessages);

      // Save assistant response
      if (response) {
        await addMessage(convId, response);
      }

      // Increment trigger to force re-selection after the list reorders
      setSelectionTrigger((prev) => prev + 1);
    },
    [currentId, currentConversation, isLoading, createConversation, setCurrentId, addMessage, sendMessage],
  );

  const handleNewChat = useCallback(async () => {
    await setCurrentId(null);
    setSearchText("");
  }, [setCurrentId]);

  const handleSelectConversation = useCallback(
    async (conv: { id: string }) => {
      if (currentId === conv.id) {
        setSearchText("");
        return;
      }
      await setCurrentId(conv.id);
      setSearchText("");
    },
    [currentId, setCurrentId],
  );

  const handleDeleteConversation = useCallback(
    async (conv: { id: string; title: string }) => {
      const confirmed = await confirmAlert({
        title: "Delete Conversation",
        message: `Are you sure you want to delete "${conv.title}"?`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (confirmed) {
        const wasCurrentConversation = currentId === conv.id;
        await deleteConversation(conv.id);

        // If we deleted the current conversation, select the next one or new chat
        if (wasCurrentConversation) {
          const remaining = conversations.filter((c) => c.id !== conv.id);
          if (remaining.length > 0) {
            await setCurrentId(remaining[0].id);
          }
          // If no conversations left, setCurrentId(null) was already called in deleteConversation
        }
      }
    },
    [currentId, conversations, deleteConversation, setCurrentId],
  );

  // Messages to display (from store)
  const messages = currentConversation?.messages ?? [];

  // Selected item ID for the list
  const selectedItemId = currentId ?? "new-chat";

  // Loading state while store initializes
  if (!isLoaded) {
    return (
      <ChatView
        conversations={[]}
        currentConversation={null}
        messages={[]}
        streamingContent=""
        isLoading={true}
        searchText=""
        selectedItemId="new-chat"
        selectionTrigger={0}
        onSearchTextChange={() => {}}
        onSubmit={() => {}}
        onNewChat={() => {}}
        onSelectConversation={() => {}}
        onDeleteConversation={() => {}}
      />
    );
  }

  return (
    <ChatView
      conversations={conversations}
      currentConversation={currentConversation}
      messages={messages}
      streamingContent={streamingContent}
      isLoading={isLoading}
      searchText={searchText}
      selectedItemId={selectedItemId}
      selectionTrigger={selectionTrigger}
      onSearchTextChange={setSearchText}
      onSubmit={handleSubmit}
      onNewChat={handleNewChat}
      onSelectConversation={handleSelectConversation}
      onDeleteConversation={handleDeleteConversation}
    />
  );
}

import { useState, useEffect, useCallback } from "react";
import { Message } from "../providers/base";
import {
  Conversation,
  getConversations,
  saveConversation as storageSaveConversation,
  deleteConversation as storageDeleteConversation,
  getCurrentConversationId,
  setCurrentConversationId,
  createConversation as storageCreateConversation,
  generateTitle,
} from "../utils/storage";

interface UseChatStoreReturn {
  isLoaded: boolean;
  conversations: Conversation[];
  currentId: string | null;
  currentConversation: Conversation | null;
  setCurrentId: (id: string | null) => Promise<void>;
  addMessage: (conversationId: string, message: Message) => Promise<void>;
  createConversation: (firstMessage?: string) => Promise<string>;
  deleteConversation: (id: string) => Promise<void>;
}

export function useChatStore(): UseChatStoreReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentId, setCurrentIdState] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from LocalStorage on mount
  useEffect(() => {
    async function load() {
      const [convs, storedCurrentId] = await Promise.all([getConversations(), getCurrentConversationId()]);
      setConversations(convs);

      // Validate that currentId exists in conversations
      if (storedCurrentId && convs.some((c) => c.id === storedCurrentId)) {
        setCurrentIdState(storedCurrentId);
      } else {
        setCurrentIdState(null);
      }

      setIsLoaded(true);
    }
    load();
  }, []);

  // Derived state: current conversation
  const currentConversation = conversations.find((c) => c.id === currentId) ?? null;

  // Change current conversation
  const setCurrentId = useCallback(
    async (id: string | null) => {
      // Avoid unnecessary updates
      if (id === currentId) return;

      setCurrentIdState(id);
      await setCurrentConversationId(id);
    },
    [currentId],
  );

  // Add message to a conversation
  const addMessage = useCallback(async (conversationId: string, message: Message) => {
    setConversations((prev) => {
      const updated = prev.map((conv) => {
        if (conv.id !== conversationId) return conv;

        const newMessages = [...conv.messages, message];
        return {
          ...conv,
          messages: newMessages,
          title: generateTitle(newMessages),
          updatedAt: Date.now(),
        };
      });

      // Sort by updatedAt
      return updated.sort((a, b) => b.updatedAt - a.updatedAt);
    });

    // Also persist to storage
    const convs = await getConversations();
    const conv = convs.find((c) => c.id === conversationId);
    if (conv) {
      const newMessages = [...conv.messages, message];
      const updated: Conversation = {
        ...conv,
        messages: newMessages,
        title: generateTitle(newMessages),
        updatedAt: Date.now(),
      };
      await storageSaveConversation(updated);
    }
  }, []);

  // Create a new conversation
  const createConversation = useCallback(async (firstMessage?: string): Promise<string> => {
    const newConv = storageCreateConversation(firstMessage);

    // Add to state
    setConversations((prev) => [newConv, ...prev]);

    // Persist to storage
    await storageSaveConversation(newConv);

    return newConv.id;
  }, []);

  // Delete a conversation
  const deleteConversation = useCallback(
    async (id: string) => {
      // Remove from state
      setConversations((prev) => prev.filter((c) => c.id !== id));

      // If it was the current conversation, clear currentId
      if (currentId === id) {
        setCurrentIdState(null);
        await setCurrentConversationId(null);
      }

      // Remove from storage
      await storageDeleteConversation(id);
    },
    [currentId],
  );

  return {
    isLoaded,
    conversations,
    currentId,
    currentConversation,
    setCurrentId,
    addMessage,
    createConversation,
    deleteConversation,
  };
}

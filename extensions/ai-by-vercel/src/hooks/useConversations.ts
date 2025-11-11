import { useState, useEffect, useCallback } from "react";
import { LocalStorage, showToast, Toast } from "@raycast/api";
import type { Conversation } from "../types";

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    try {
      const stored = await LocalStorage.getItem<string>("conversations");
      if (stored) {
        setConversations(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load conversations:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const addConversation = useCallback(async (conversation: Conversation) => {
    setConversations((prev) => {
      const updated = [conversation, ...prev];
      LocalStorage.setItem("conversations", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateConversation = useCallback(async (id: string, updates: Partial<Conversation>) => {
    setConversations((prev) => {
      const updated = prev.map((conv) => (conv.id === id ? { ...conv, ...updates, timestamp: Date.now() } : conv));
      LocalStorage.setItem("conversations", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    setConversations((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      LocalStorage.setItem("conversations", JSON.stringify(updated));
      return updated;
    });
    await showToast({
      style: Toast.Style.Success,
      title: "Conversation deleted",
    });
  }, []);

  const deleteAllConversations = useCallback(async () => {
    setConversations([]);
    await LocalStorage.removeItem("conversations");
    await showToast({
      style: Toast.Style.Success,
      title: "All conversations deleted",
    });
  }, []);

  return {
    conversations,
    isLoading,
    addConversation,
    updateConversation,
    deleteConversation,
    deleteAllConversations,
  };
}

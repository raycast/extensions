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
    let updatedConversations: Conversation[] = [];
    setConversations((prev) => {
      updatedConversations = [conversation, ...prev];
      return updatedConversations;
    });
    try {
      await LocalStorage.setItem("conversations", JSON.stringify(updatedConversations));
    } catch (error) {
      console.error("Failed to save conversation:", error);
    }
  }, []);

  const updateConversation = useCallback(async (id: string, updates: Partial<Conversation>) => {
    let updatedConversations: Conversation[] = [];
    setConversations((prev) => {
      updatedConversations = prev.map((conv) =>
        conv.id === id ? { ...conv, ...updates, timestamp: Date.now() } : conv,
      );
      return updatedConversations;
    });
    try {
      await LocalStorage.setItem("conversations", JSON.stringify(updatedConversations));
    } catch (error) {
      console.error("Failed to update conversation:", error);
    }
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    let updatedConversations: Conversation[] = [];
    setConversations((prev) => {
      updatedConversations = prev.filter((c) => c.id !== id);
      return updatedConversations;
    });
    try {
      await LocalStorage.setItem("conversations", JSON.stringify(updatedConversations));
      await showToast({
        style: Toast.Style.Success,
        title: "Conversation deleted",
      });
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
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

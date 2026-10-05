import { useState, useEffect, useCallback, useRef } from "react";
import { LocalStorage, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import type { Conversation } from "../types";

const STORAGE_KEY = "conversations";

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Source of truth for writes: setState updaters aren't guaranteed to run before we persist.
  const current = useRef<Conversation[]>([]);

  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    try {
      const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
      if (stored) {
        current.current = JSON.parse(stored);
        setConversations(current.current);
      }
    } catch (error) {
      console.error("Failed to load conversations:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const writes = useRef<Promise<void>>(Promise.resolve());

  // Serialize writes, and derive each one from the last *saved* list, so concurrent updates
  // can't drop each other. Memory only changes once LocalStorage accepts the write; errors reach the caller.
  const persist = useCallback((update: (saved: Conversation[]) => Conversation[]) => {
    const write = writes.current
      .catch(() => undefined)
      .then(async () => {
        const next = update(current.current);
        await (next.length
          ? LocalStorage.setItem(STORAGE_KEY, JSON.stringify(next))
          : LocalStorage.removeItem(STORAGE_KEY));
        current.current = next;
        setConversations(next);
      });
    writes.current = write;
    return write;
  }, []);

  const addConversation = useCallback(
    (conversation: Conversation) => persist((saved) => [conversation, ...saved]),
    [persist],
  );

  const updateConversation = useCallback(
    (id: string, update: (saved: Conversation) => Partial<Conversation>) =>
      persist((saved) =>
        saved.map((conv) => (conv.id === id ? { ...conv, ...update(conv), timestamp: Date.now() } : conv)),
      ),
    [persist],
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        await persist((saved) => saved.filter((c) => c.id !== id));
        await showToast({ style: Toast.Style.Success, title: "Conversation deleted" });
      } catch (error) {
        await showFailureToast(error, { title: "Failed to delete conversation" });
      }
    },
    [persist],
  );

  const deleteAllConversations = useCallback(async () => {
    try {
      await persist(() => []);
      await showToast({ style: Toast.Style.Success, title: "All conversations deleted" });
    } catch (error) {
      await showFailureToast(error, { title: "Failed to delete conversations" });
    }
  }, [persist]);

  return {
    conversations,
    isLoading,
    addConversation,
    updateConversation,
    deleteConversation,
    deleteAllConversations,
  };
}

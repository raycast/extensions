import { randomUUID } from "node:crypto";
import { useState, useEffect, useCallback } from "react";
import {
  getConversationIndex,
  getConversation,
  saveConversation,
  deleteConversation,
  renameConversation,
  clearAllConversations,
  isAtMessageLimit,
} from "../lib/storage";
import type { Conversation, ConversationSummary } from "../types";

export function useConversations() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    const index = await getConversationIndex();
    setConversations(index);
    setIsLoading(false);
  }, []);

  const create = useCallback(
    async (model: string): Promise<string> => {
      const id = randomUUID();
      const conversation: Conversation = {
        id,
        title: "New Conversation",
        model,
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveConversation(conversation);
      await load();
      return id;
    },
    [load],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteConversation(id);
      await load();
    },
    [load],
  );

  const rename = useCallback(
    async (id: string, title: string) => {
      await renameConversation(id, title);
      await load();
    },
    [load],
  );

  const clearAll = useCallback(async () => {
    await clearAllConversations();
    await load();
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    conversations,
    isLoading,
    create,
    remove,
    rename,
    clearAll,
    reload: load,
  };
}

export { getConversation, saveConversation, isAtMessageLimit };

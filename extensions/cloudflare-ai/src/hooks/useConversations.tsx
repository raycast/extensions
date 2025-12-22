import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Conversation, ConversationsHook } from "../types";

export function useConversations(): ConversationsHook {
  const [data, setData] = useState<Conversation[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);

  // Load conversations from LocalStorage on mount
  useEffect(() => {
    (async () => {
      const stored = await LocalStorage.getItem<string>("cloudflare-ai-conversations");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setData(parsed);
        } catch (error) {
          console.error("Failed to parse stored conversations:", error);
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to load conversation history",
            message: "Starting fresh",
          });
        }
      }
      setLoading(false);
    })();
  }, []);

  // Auto-save conversations to LocalStorage whenever data changes
  useEffect(() => {
    if (!isLoading) {
      // Filter out conversations with no chats before saving
      const conversationsToSave = data.filter((conv) => conv.chats.length > 0);
      LocalStorage.setItem("cloudflare-ai-conversations", JSON.stringify(conversationsToSave));
    }
  }, [data, isLoading]);

  const add = useCallback(
    async (conversation: Conversation) => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Saving conversation...",
      });

      try {
        setData((prev) => {
          // Check if conversation already exists
          const existing = prev.find((c) => c.id === conversation.id);
          if (existing) {
            // Update existing
            return prev.map((c) => (c.id === conversation.id ? conversation : c));
          }
          // Add new
          return [...prev, conversation];
        });

        toast.style = Toast.Style.Success;
        toast.title = "Conversation saved";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to save conversation";
        toast.message = error instanceof Error ? error.message : "Unknown error";
      }
    },
    [setData],
  );

  const update = useCallback(
    async (conversation: Conversation) => {
      setData((prev) => prev.map((c) => (c.id === conversation.id ? conversation : c)));
    },
    [setData],
  );

  const remove = useCallback(
    async (conversation: Conversation) => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Removing conversation...",
      });

      try {
        setData((prev) => prev.filter((c) => c.id !== conversation.id));

        toast.style = Toast.Style.Success;
        toast.title = "Conversation removed";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to remove conversation";
        toast.message = error instanceof Error ? error.message : "Unknown error";
      }
    },
    [setData],
  );

  const clear = useCallback(async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Clearing conversations...",
    });

    try {
      setData([]);
      await LocalStorage.removeItem("cloudflare-ai-conversations");

      toast.style = Toast.Style.Success;
      toast.title = "Conversations cleared";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to clear conversations";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  }, [setData]);

  return useMemo(
    () => ({
      data,
      isLoading,
      add,
      update,
      remove,
      clear,
    }),
    [data, isLoading, add, update, remove, clear],
  );
}

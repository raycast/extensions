import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Conversation } from "../types/conversation";
import { useQuestions } from "./useQuestions";

export function useConversations() {
  const [data, setData] = useState<Conversation[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);
  const {
    isLoading: isLoadingQuestions,
    getByConversationId: getQuestionsByConversationId,
    removeByConversationId: removeQuestionByConversationId,
    refresh: refreshQuestions,
  } = useQuestions();

  useEffect(() => {
    if (isLoadingQuestions) {
      return;
    }

    (async () => {
      const stored = await LocalStorage.getItem<string>("conversations");
      if (stored) {
        // Default conversations stored without questions
        const items: Conversation[] = JSON.parse(stored);
        const sortedItems = items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Enrich conversations with questions
        const enrichedItems = sortedItems.map((conversation) => ({
          ...conversation,
          questions: getQuestionsByConversationId(conversation.id),
        }));

        setData(enrichedItems);
      }
      setLoading(false);
    })();
  }, [isLoadingQuestions]);

  const saveToLocalStorage = async (conversations: Conversation[]) => {
    try {
      await LocalStorage.setItem("conversations", JSON.stringify(conversations));
    } catch (error) {
      showToast({
        title: "Failed to save conversation",
        style: Toast.Style.Failure,
      });
      throw error;
    }
  };

  const add = useCallback(
    async (conversation: Conversation) => {
      setLoading(true);
      const toast = await showToast({
        title: "Creating conversation...",
        style: Toast.Style.Animated,
      });
      const newData = [...data, conversation];
      await saveToLocalStorage(newData);
      setData(newData);

      toast.title = "Conversation created!";
      toast.style = Toast.Style.Success;
      setLoading(false);
    },
    [data],
  );

  const update = useCallback(
    async (conversation: Conversation) => {
      setLoading(true);
      const toast = await showToast({
        title: "Updating Conversation...",
        style: Toast.Style.Animated,
      });

      const newData = data.map((c) => (c.id === conversation.id ? conversation : c));
      await saveToLocalStorage(newData);
      setData(newData);

      toast.title = "Conversation updated!";
      toast.style = Toast.Style.Success;
      setLoading(false);
    },
    [data],
  );

  const remove = useCallback(
    async (conversation: Conversation) => {
      setLoading(true);
      const toast = await showToast({
        title: "Removing conversation...",
        style: Toast.Style.Animated,
      });

      try {
        // Remove all questions in conversation
        await removeQuestionByConversationId(conversation.id);

        // Remove conversation
        const newData = data.filter((q) => q.id !== conversation.id);
        await saveToLocalStorage(newData);
        setData(newData);

        toast.title = "Conversation removed!";
        toast.style = Toast.Style.Success;
      } catch (error) {
        console.error("Error removing conversation:", error);
        toast.title = "Failed to remove conversation";
        toast.style = Toast.Style.Failure;
      } finally {
        setLoading(false);
      }
    },
    [data],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const stored = await LocalStorage.getItem<string>("conversations");

      if (stored) {
        // Default conversations stored without questions
        const items: Conversation[] = JSON.parse(stored);
        const sortedItems = items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Refresh questions hook in order to fetch latest enrichedItems
        await refreshQuestions();

        // Enrich conversations with questions
        const enrichedItems = sortedItems.map((conversation) => ({
          ...conversation,
          questions: getQuestionsByConversationId(conversation.id),
        }));

        setData(enrichedItems);
      } else {
        console.error("Error refreshing conversations: No conversations found.");
      }
    } catch (error) {
      console.error("Error refreshing conversations:", error);
    } finally {
      setLoading(false);
    }
  }, [getQuestionsByConversationId]);

  return useMemo(
    () => ({ data, isLoading, add, update, remove, refresh }),
    [data, isLoading, add, update, remove, refresh],
  );
}

import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Question } from "../types/question";

export function useQuestions() {
  const [data, setData] = useState<Question[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      const stored = await LocalStorage.getItem<string>("questions");
      if (stored) {
        setData(JSON.parse(stored));
      }
      setLoading(false);
    })();
  }, []);

  const saveToLocalStorage = async (questions: Question[]) => {
    try {
      await LocalStorage.setItem("questions", JSON.stringify(questions));
    } catch (error) {
      showToast({
        title: "Failed to save question",
        style: Toast.Style.Failure,
      });
      throw error;
    }
  };

  const add = useCallback(
    async (question: Question) => {
      const toast = await showToast({
        title: "Saving question...",
        style: Toast.Style.Animated,
      });
      const newData = [question, ...data]; // Use the current state directly
      setData(newData); // Update state optimistically
      try {
        await saveToLocalStorage(newData); // Save to LocalStorage
        toast.title = "Question saved!";
        toast.style = Toast.Style.Success;
      } catch (error) {
        console.error("Failed to save question:", error);
        toast.title = "Failed to save question!";
        toast.style = Toast.Style.Failure;
      }
    },
    [data],
  );

  // TODO: fix to align with `add`
  const update = useCallback(async (question: Question, hideToast?: boolean) => {
    let toast;
    if (!hideToast) {
      toast = await showToast({
        title: "Updating question...",
        style: Toast.Style.Animated,
      });
    }

    setData((prev) => {
      const newData = prev.map((q) => (q.id === question.id ? question : q));
      saveToLocalStorage(newData);
      return newData;
    });

    if (!hideToast && toast) {
      toast.title = "Question updated!";
      toast.style = Toast.Style.Success;
    }
  }, []);

  // TODO: fix to align with `add`
  const remove = useCallback(async (question: Question) => {
    const toast = await showToast({
      title: "Removing question...",
      style: Toast.Style.Animated,
    });
    setData((prev) => {
      const newData = prev.filter((q) => q.id !== question.id);
      saveToLocalStorage(newData);
      return newData;
    });
    toast.title = "Question removed!";
    toast.style = Toast.Style.Success;
  }, []);

  const removeByConversationId = useCallback(async (conversationId: string) => {
    const toast = await showToast({
      title: "Removing conversation questions...",
      style: Toast.Style.Animated,
    });

    try {
      setData((prev) => {
        const newData = prev.filter((q) => q.conversationId !== conversationId);
        saveToLocalStorage(newData);
        return newData;
      });

      toast.title = "Conversation questions removed!";
      toast.style = Toast.Style.Success;
    } catch (error) {
      console.error("Failed to remove conversation questions:", error);
      toast.title = "Failed to remove conversation questions";
      toast.style = Toast.Style.Failure;
    }
  }, []);

  const updateQuestionsByModelId = useCallback(async (modelId: string) => {
    const toast = await showToast({
      title: "Updating questions for this model...",
      style: Toast.Style.Animated,
    });

    try {
      setData((prev) => {
        const newData = prev.map((q) => (q.modelId === modelId ? { ...q, modelId: undefined } : q));
        saveToLocalStorage(newData);
        return newData;
      });

      toast.title = "Model questions updated!";
      toast.style = Toast.Style.Success;
    } catch (error) {
      console.error("Failed to update model questions:", error);
      toast.title = "Failed to update model questions";
      toast.style = Toast.Style.Failure;
    }
  }, []);

  const getByConversationId = useCallback(
    (conversationId: string) => {
      return data.filter((q) => q.conversationId === conversationId);
    },
    [data],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const stored = await LocalStorage.getItem<string>("questions");
      if (stored) {
        const items: Question[] = JSON.parse(stored);
        setData(items);
      }
    } catch (error) {
      console.error("Error refreshing conversations:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  return useMemo(
    () => ({
      data,
      isLoading,
      add,
      update,
      remove,
      removeByConversationId,
      getByConversationId,
      updateQuestionsByModelId,
      refresh,
    }),
    [
      data,
      isLoading,
      add,
      update,
      remove,
      removeByConversationId,
      getByConversationId,
      updateQuestionsByModelId,
      refresh,
    ],
  );
}

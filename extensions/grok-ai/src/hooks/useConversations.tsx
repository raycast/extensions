import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Conversation, ConversationsHook } from "../type";
import { useAutoSaveConversation } from "./useAutoSaveConversation";

export function useConversations(): ConversationsHook {
  const [data, setData] = useState<Conversation[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);

  const isAutoSaveConversation = useAutoSaveConversation();

  useEffect(() => {
    (async () => {
      const storedConversations = await LocalStorage.getItem<string>("conversations");

      if (storedConversations) {
        setData((previous) => [...previous, ...JSON.parse(storedConversations)]);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    LocalStorage.setItem("conversations", JSON.stringify(data.filter((x) => x.chats.length > 0)));
  }, [data]);

  const add = useCallback(
    async (conversation: Conversation) => {
      setData([...data, conversation]);
      if (!isAutoSaveConversation) {
        await showToast({
          title: "Conversation saved!",
          style: Toast.Style.Success,
        });
      }
    },
    [setData, data],
  );

  const update = useCallback(
    async (conversation: Conversation) => {
      setData((prev) => {
        return prev.map((x) => {
          if (x.id === conversation.id) {
            return conversation;
          }
          return x;
        });
      });
    },
    [setData, data],
  );

  const setConversations = useCallback(
    async (conversations: Conversation[]) => {
      setData(conversations);
    },
    [setData],
  );

  const remove = useCallback(
    async (conversation: Conversation) => {
      const toast = await showToast({
        title: "Removing conversation...",
        style: Toast.Style.Animated,
      });
      const newConversations: Conversation[] = data.filter((item) => item.id !== conversation.id);
      setData(newConversations);
      toast.title = "Conversation removed!";
      toast.style = Toast.Style.Success;
    },
    [setData, data],
  );

  const clear = useCallback(async () => {
    const toast = await showToast({
      title: "Clearing conversations ...",
      style: Toast.Style.Animated,
    });
    setData([]);
    toast.title = "Conversations cleared!";
    toast.style = Toast.Style.Success;
  }, [setData]);

  return useMemo(
    () => ({ data, isLoading, add, update, remove, clear, setConversations }),
    [data, isLoading, add, update, remove, clear, setConversations],
  );
}

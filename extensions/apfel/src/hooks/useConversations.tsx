import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Conversation, ConversationsHook } from "../type";

export function useConversations(): ConversationsHook {
  const [data, setData] = useState<Conversation[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    (async () => {
      const storedConversations = await LocalStorage.getItem<string>("conversations");

      if (storedConversations) {
        setData((previous) => [...previous, ...JSON.parse(storedConversations)]);
      }

      setLoading(false);
      hasLoadedRef.current = true;
    })();
  }, []);

  useEffect(() => {
    if (!hasLoadedRef.current) return;

    LocalStorage.setItem("conversations", JSON.stringify(data.filter((x) => x.chats.length > 0)));
  }, [data]);

  const add = useCallback(
    async (conversation: Conversation) => {
      setData((prev) => [...prev, conversation]);
    },
    [setData],
  );

  const update = useCallback(
    async (conversation: Conversation) => {
      setData((prev) => prev.map((x) => (x.id === conversation.id ? conversation : x)));
    },
    [setData],
  );

  const remove = useCallback(
    async (conversation: Conversation) => {
      const toast = await showToast({
        title: "Removing conversation...",
        style: Toast.Style.Animated,
      });
      setData((prev) => prev.filter((item) => item.id !== conversation.id));
      toast.title = "Conversation removed!";
      toast.style = Toast.Style.Success;
    },
    [setData],
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
    () => ({ data, isLoading, add, update, remove, clear }),
    [data, isLoading, add, update, remove, clear],
  );
}

import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Chat, SavedChat, SavedChatHook } from "../type";

export function useSavedChat(): SavedChatHook {
  const [data, setData] = useState<SavedChat[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      const storedSavedChats = await LocalStorage.getItem<string>("savedChats");

      if (storedSavedChats) {
        setData((previous) => [...previous, ...JSON.parse(storedSavedChats)]);
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    LocalStorage.setItem("savedChats", JSON.stringify(data));
  }, [data]);

  const add = useCallback(
    async (chat: Chat) => {
      const toast = await showToast({
        title: "Saving your answer...",
        style: Toast.Style.Animated,
      });
      const newSavedChat: SavedChat = { ...chat, saved_at: new Date().toISOString() };
      setData([...data, newSavedChat]);
      toast.title = "Answer saved!";
      toast.style = Toast.Style.Success;
    },
    [setData, data]
  );

  const remove = useCallback(
    async (chat: Chat) => {
      const toast = await showToast({
        title: "Unsaving your answer...",
        style: Toast.Style.Animated,
      });
      const newSavedChats = data.filter((savedAnswer) => savedAnswer.id !== chat.id);
      setData(newSavedChats);
      toast.title = "Answer unsaved!";
      toast.style = Toast.Style.Success;
    },
    [setData, data]
  );

  const clear = useCallback(async () => {
    const toast = await showToast({
      title: "Clearing your saved answers...",
      style: Toast.Style.Animated,
    });
    setData([]);
    toast.title = "Saved answers cleared!";
    toast.style = Toast.Style.Success;
  }, [setData]);

  return useMemo(() => ({ data, isLoading, add, remove, clear }), [data, isLoading, add, remove, clear]);
}

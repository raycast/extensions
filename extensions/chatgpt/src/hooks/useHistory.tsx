import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Chat, HistoryHook } from "../type";

export function useHistory(): HistoryHook {
  const [data, setData] = useState<Chat[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      const storedHistory = await LocalStorage.getItem<string>("history");

      if (storedHistory) {
        setData((previous) => [...previous, ...JSON.parse(storedHistory)]);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    LocalStorage.setItem("history", JSON.stringify(data));
  }, [data]);

  const add = useCallback(
    async (chat: Chat) => {
      setData([...data, chat]);
    },
    [setData, data],
  );

  const remove = useCallback(
    async (answer: Chat) => {
      const toast = await showToast({
        title: "Removing answer...",
        style: Toast.Style.Animated,
      });
      const newHistory: Chat[] = data.filter((item) => item.id !== answer.id);
      setData(newHistory);
      toast.title = "Answer removed!";
      toast.style = Toast.Style.Success;
    },
    [setData, data],
  );

  const clear = useCallback(async () => {
    const toast = await showToast({
      title: "Clearing history...",
      style: Toast.Style.Animated,
    });
    setData([]);
    toast.title = "History cleared!";
    toast.style = Toast.Style.Success;
  }, [setData]);

  return useMemo(() => ({ data, isLoading, add, remove, clear }), [data, isLoading, add, remove, clear]);
}

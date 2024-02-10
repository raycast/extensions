import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { IQueryHistory } from "@src/interface";
import { getAllConfig } from "@src/util";
import { LOCAL_STORAGE_TYPE } from "@src/constants";

export function useHistory() {
  const [data, setData] = useState<IQueryHistory[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      const storedHistory = (await getAllConfig(
        LOCAL_STORAGE_TYPE.HISTORY
      )) as IQueryHistory[];

      if (storedHistory) {
        setData(previous => [...previous, ...storedHistory]);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    LocalStorage.setItem("history", JSON.stringify(data));
  }, [data]);

  const add = useCallback(
    async (chat: IQueryHistory) => {
      setData([...data, chat]);
    },
    [setData, data]
  );

  const remove = useCallback(
    async (answer: IQueryHistory) => {
      const toast = await showToast({
        title: "Removing answer...",
        style: Toast.Style.Animated,
      });
      const newHistory: IQueryHistory[] = data.filter(
        item => item.id !== answer.id
      );
      setData(newHistory);
      toast.title = "Answer removed!";
      toast.style = Toast.Style.Success;
    },
    [setData, data]
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

  return useMemo(
    () => ({ data, isLoading, add, remove, clear }),
    [data, isLoading, add, remove, clear]
  );
}

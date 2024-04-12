import { getPreferenceValues, LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { promises as fs } from "fs";
import { TranslateMode, TranslateResult } from "../providers/types";

export interface Record {
  id: string;
  created_at: string;
  mode: TranslateMode;
  result: TranslateResult;
  ocrImg: string | undefined;
  provider: string | undefined;
}

export interface HistoryHook {
  data: Record[] | undefined;
  isLoading: boolean;
  add: (arg: Record) => Promise<void>;
  remove: (arg: Record) => Promise<void>;
  clear: () => Promise<void>;
}

export function useHistory(): HistoryHook {
  const { maxHistorySize } = getPreferenceValues<{ maxHistorySize: string }>();
  const [data, setData] = useState<Record[]>();
  const countRef = useRef(data);
  const [isLoading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      const storedHistory = await LocalStorage.getItem<string>("history");
      setData(storedHistory ? JSON.parse(storedHistory) : []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (data) {
      if (countRef.current != data) {
        countRef.current = data;
      }
      LocalStorage.setItem("history", JSON.stringify(data));
    }
  }, [data]);

  const unlink = async function (r: Record) {
    if (r.ocrImg) {
      try {
        await fs.unlink(r.ocrImg);
      } catch {
        //
      }
    }
  };

  const add = useCallback(
    async (record: Record) => {
      const data = countRef.current;
      if (data) {
        const max = (parseInt(maxHistorySize) || 30) - 1;
        const slice = data.length > max ? data.slice(0, max) : data;
        const remove = data.length > max ? data.slice(max, data.length) : [];
        for (const r of remove) {
          await unlink(r);
        }

        setData([record, ...slice]);
      }
    },
    [setData, data],
  );

  const remove = useCallback(
    async (record: Record) => {
      const data = countRef.current;
      if (data) {
        const toast = await showToast({
          title: "Removing record...",
          style: Toast.Style.Animated,
        });
        const newHistory: Record[] = data.filter((item) => item.id !== record.id);
        await unlink(record);
        setData(newHistory);
        toast.title = "Record removed!";
        toast.style = Toast.Style.Success;
      }
    },
    [setData, data],
  );

  const clear = useCallback(async () => {
    const data = countRef.current;
    if (data) {
      const toast = await showToast({
        title: "Clearing history...",
        style: Toast.Style.Animated,
      });
      for (const r of data) {
        await unlink(r);
      }
      setData([]);
      toast.title = "History cleared!";
      toast.style = Toast.Style.Success;
    }
  }, [setData, data]);

  return useMemo(() => ({ data, isLoading, add, remove, clear }), [data, isLoading, add, remove, clear]);
}

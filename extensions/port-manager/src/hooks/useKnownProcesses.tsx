import { LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";

export type Entry = { name: string; port: string };
export const STORAGE_KEY = "known-ports";

export function useKnownProcesses() {
  const [data, setData] = useState<Entry[] | false>(false);
  useEffect(() => {
    LocalStorage.getItem<string>(STORAGE_KEY).then((data) => {
      const empty: Entry = { name: "", port: "" };
      setData(data ? JSON.parse(data).concat([empty]) : [empty]);
    });
  }, []);
  return [data, setData] as const;
}

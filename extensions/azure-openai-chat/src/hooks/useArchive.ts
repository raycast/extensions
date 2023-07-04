import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { History } from "./useHistories";

export interface Archive {
  date: number;
  archiveHistory: History[];
}

const STORAGE_ARCHIVES_KEY = "Archives";

export function useArchive() {
  const [archives, setArchives] = useState<Archive[]>([]);

  useEffect(() => {
    (async () => {
      const storageArchive: Archive[] = JSON.parse((await LocalStorage.getItem(STORAGE_ARCHIVES_KEY)) ?? "[]");
      setArchives(storageArchive);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      await LocalStorage.setItem(STORAGE_ARCHIVES_KEY, JSON.stringify(archives.slice(0, 30)));
    })();
  }, [archives]);

  const handleSetArchives = (histories: History[]) => {
    const newArchiveItem = {
      date: dayjs().valueOf(),
      archiveHistory: histories,
    };
    setArchives([newArchiveItem, ...archives]);
  };

  return { archives, handleSetArchives, setArchives };
}

import { LocalStorage } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Paper } from "./paper-utils";

const READ_STORAGE_KEY = "read-papers";

export type ReadPaperRecord = {
  key: string;
  readAt: string;
};

export function getPaperStateKey(paper: Pick<Paper, "id" | "date">): string {
  return `${paper.date}::${paper.id}`;
}

async function readReadPapers(): Promise<ReadPaperRecord[]> {
  const raw = await LocalStorage.getItem<string>(READ_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((entry): entry is ReadPaperRecord => !!entry && typeof entry === "object")
      .map((entry) => ({
        key: typeof entry.key === "string" ? entry.key : "",
        readAt: typeof entry.readAt === "string" ? entry.readAt : new Date(0).toISOString(),
      }))
      .filter((entry) => entry.key.length > 0);
  } catch {
    return [];
  }
}

async function writeReadPapers(records: ReadPaperRecord[]): Promise<void> {
  await LocalStorage.setItem(READ_STORAGE_KEY, JSON.stringify(records));
}

export function useReadPapers() {
  const [readRecords, setReadRecords] = useState<ReadPaperRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const readRecordsRef = useRef<ReadPaperRecord[]>([]);
  const readWriteRef = useRef<Promise<void>>(Promise.resolve());

  const reloadReadPapers = useCallback(async () => {
    setIsLoading(true);
    const next = await readReadPapers();
    readRecordsRef.current = next;
    setReadRecords(next);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void reloadReadPapers();
  }, [reloadReadPapers]);

  const readKeys = useMemo(() => new Set(readRecords.map((record) => record.key)), [readRecords]);

  const isRead = useCallback((paper: Paper) => readKeys.has(getPaperStateKey(paper)), [readKeys]);

  const updateReadRecords = useCallback(async (updater: (current: ReadPaperRecord[]) => ReadPaperRecord[]) => {
    const nextWrite = readWriteRef.current.then(async () => {
      const next = updater(readRecordsRef.current);
      readRecordsRef.current = next;
      setReadRecords(next);
      await writeReadPapers(next);
    });
    readWriteRef.current = nextWrite.catch(() => undefined);
    await nextWrite;
  }, []);

  const markAsUnread = useCallback(
    async (paper: Paper) => {
      const key = getPaperStateKey(paper);
      await updateReadRecords((current) => current.filter((record) => record.key !== key));
    },
    [updateReadRecords],
  );

  const markAsRead = useCallback(
    async (paper: Paper) => {
      const key = getPaperStateKey(paper);
      await updateReadRecords((current) => [
        ...current.filter((record) => record.key !== key),
        {
          key,
          readAt: new Date().toISOString(),
        },
      ]);
    },
    [updateReadRecords],
  );

  return {
    isLoading,
    isRead,
    markAsRead,
    markAsUnread,
    reloadReadPapers,
  };
}

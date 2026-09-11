import { LocalStorage } from "@raycast/api";
import * as fs from "node:fs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Paper } from "./paper-utils";
import { getPaperStateKey } from "./read-utils";

const READING_QUEUE_STORAGE_KEY = "reading-queue-papers";

export type QueuedPaper = Paper & {
  queuedAt: string;
};

function normalizePaper(paper: Paper): Paper {
  return {
    ...paper,
    hasNote: fs.existsSync(paper.notePath),
  };
}

function sortQueue(queue: QueuedPaper[]): QueuedPaper[] {
  return [...queue].sort((left, right) => right.queuedAt.localeCompare(left.queuedAt));
}

async function readQueue(): Promise<QueuedPaper[]> {
  const raw = await LocalStorage.getItem<string>(READING_QUEUE_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const queue = parsed
      .filter((entry): entry is QueuedPaper => !!entry && typeof entry === "object")
      .map((entry) => ({
        ...normalizePaper(entry),
        queuedAt: typeof entry.queuedAt === "string" ? entry.queuedAt : new Date(0).toISOString(),
      }));

    return sortQueue(queue);
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedPaper[]): Promise<void> {
  await LocalStorage.setItem(READING_QUEUE_STORAGE_KEY, JSON.stringify(sortQueue(queue)));
}

export function useReadingQueue() {
  const [queue, setQueue] = useState<QueuedPaper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const queueRef = useRef<QueuedPaper[]>([]);
  const queueWriteRef = useRef<Promise<void>>(Promise.resolve());

  const reloadQueue = useCallback(async () => {
    setIsLoading(true);
    const next = await readQueue();
    queueRef.current = next;
    setQueue(next);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void reloadQueue();
  }, [reloadQueue]);

  const queueKeys = useMemo(() => new Set(queue.map((paper) => getPaperStateKey(paper))), [queue]);

  const isQueued = useCallback((paper: Paper) => queueKeys.has(getPaperStateKey(paper)), [queueKeys]);

  const updateQueue = useCallback(async (updater: (current: QueuedPaper[]) => QueuedPaper[]) => {
    const nextWrite = queueWriteRef.current.then(async () => {
      const next = updater(queueRef.current);
      queueRef.current = next;
      setQueue(next);
      await writeQueue(next);
    });
    queueWriteRef.current = nextWrite.catch(() => undefined);
    await nextWrite;
  }, []);

  const removeFromQueue = useCallback(
    async (paper: Paper) => {
      await updateQueue((current) => current.filter((entry) => getPaperStateKey(entry) !== getPaperStateKey(paper)));
    },
    [updateQueue],
  );

  const addToQueue = useCallback(
    async (paper: Paper) => {
      await updateQueue((current) =>
        sortQueue([
          ...current.filter((entry) => getPaperStateKey(entry) !== getPaperStateKey(paper)),
          {
            ...normalizePaper(paper),
            queuedAt: new Date().toISOString(),
          },
        ]),
      );
    },
    [updateQueue],
  );

  return {
    queue,
    isLoading,
    isQueued,
    addToQueue,
    removeFromQueue,
    reloadQueue,
  };
}

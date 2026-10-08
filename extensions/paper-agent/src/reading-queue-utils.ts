import { LocalStorage } from "@raycast/api";
import * as fs from "node:fs";
import { type Paper, parseSavedPapers } from "./paper-utils";
import { getPaperStateKey } from "./read-utils";
import { createListStore } from "./list-store";
import { useListStore } from "./use-list-store";

const READING_QUEUE_STORAGE_KEY = "reading-queue-papers";

export type QueuedPaper = Paper & { queuedAt: string };

function sortQueue(items: QueuedPaper[]): QueuedPaper[] {
  return [...items].sort((left, right) => right.queuedAt.localeCompare(left.queuedAt));
}

async function readQueue(): Promise<QueuedPaper[]> {
  const raw = await LocalStorage.getItem<string>(READING_QUEUE_STORAGE_KEY);
  if (!raw) return [];
  const parsed = parseSavedPapers(raw);
  return sortQueue(
    parsed.map((entry) => ({
      ...entry,
      hasNote: fs.existsSync(entry.notePath),
      queuedAt:
        typeof (entry as QueuedPaper).queuedAt === "string"
          ? (entry as QueuedPaper).queuedAt
          : new Date(0).toISOString(),
    })),
  );
}

const store = createListStore(readQueue, async (items) => {
  await LocalStorage.setItem(READING_QUEUE_STORAGE_KEY, JSON.stringify(sortQueue(items)));
});

export function useReadingQueue() {
  const { items, isLoading, error } = useListStore(store, "Could not load reading queue");
  const isQueued = (paper: Paper) => items.some((entry) => getPaperStateKey(entry) === getPaperStateKey(paper));
  const remove = (paper: Paper) =>
    store.update((current) => current.filter((entry) => getPaperStateKey(entry) !== getPaperStateKey(paper)));
  const add = (paper: Paper) =>
    store.update((current) =>
      sortQueue([
        ...current.filter((entry) => getPaperStateKey(entry) !== getPaperStateKey(paper)),
        { ...paper, hasNote: fs.existsSync(paper.notePath), queuedAt: new Date().toISOString() },
      ]),
    );
  return {
    queue: items,
    isLoading,
    error,
    isQueued,
    addToQueue: add,
    removeFromQueue: remove,
    reloadQueue: store.reload,
  };
}

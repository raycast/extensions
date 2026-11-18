import { LocalStorage } from "@raycast/api";
import { type Paper } from "./paper-utils";
import { createListStore } from "./list-store";
import { useListStore } from "./use-list-store";

const READ_STORAGE_KEY = "read-papers";
export type ReadPaperRecord = { key: string; readAt: string };

export function getPaperStateKey(paper: Pick<Paper, "id" | "date">): string {
  return `${paper.date}::${paper.id}`;
}

async function readReadPapers(): Promise<ReadPaperRecord[]> {
  const raw = await LocalStorage.getItem<string>(READ_STORAGE_KEY);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || !parsed.every((entry) => entry && typeof entry.key === "string")) {
    throw new Error("Saved reading state is invalid. Existing data has not been overwritten.");
  }
  return parsed.map((entry) => ({
    key: entry.key,
    readAt: typeof entry.readAt === "string" ? entry.readAt : new Date(0).toISOString(),
  }));
}

const store = createListStore(readReadPapers, async (items) => {
  await LocalStorage.setItem(READ_STORAGE_KEY, JSON.stringify(items));
});

export function useReadPapers() {
  const { items, isLoading, error } = useListStore(store, "Could not load reading state");
  return {
    isLoading,
    error,
    isRead: (paper: Paper) => items.some((entry) => entry.key === getPaperStateKey(paper)),
    markAsUnread: (paper: Paper) =>
      store.update((current) => current.filter((entry) => entry.key !== getPaperStateKey(paper))),
    markAsRead: (paper: Paper) =>
      store.update((current) => [
        ...current.filter((entry) => entry.key !== getPaperStateKey(paper)),
        { key: getPaperStateKey(paper), readAt: new Date().toISOString() },
      ]),
    reloadReadPapers: store.reload,
  };
}

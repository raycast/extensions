import { LocalStorage } from "@raycast/api";
import { useEffect, useSyncExternalStore } from "react";
import { Board } from "./issue";
import { sourceKey } from "./source";

// The boards the user picked to see, in their order. The first is the default.
// Kept in local storage per account, since it's the user's setup and must outlive Raycast's cache.
// One copy per command, so a board pinned in Manage Boards shows at once in the board view it was opened from.

const saved = new Map<string, Board[]>();
const listeners = new Set<() => void>();
const loading = new Map<string, Promise<void>>();

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function load(key: string): Promise<void> {
  let promise = loading.get(key);
  if (!promise) {
    promise = LocalStorage.getItem<string>(key)
      .then((value) => {
        try {
          const parsed = value ? JSON.parse(value) : [];
          saved.set(key, Array.isArray(parsed) ? parsed : []);
        } catch {
          saved.set(key, []);
        }
      })
      .catch(() => {
        saved.set(key, []);
      })
      .finally(notify);
    loading.set(key, promise);
  }
  return promise;
}

async function save(key: string, boards: Board[]) {
  saved.set(key, boards);
  notify();
  await LocalStorage.setItem(key, JSON.stringify(boards));
}

export interface PinnedBoards {
  /** False until local storage has been read, so a picker isn't flashed at someone with pins. */
  ready: boolean;
  boards: Board[];
  isPinned: (board: Board) => boolean;
  pin: (board: Board) => Promise<void>;
  unpin: (board: Board) => Promise<void>;
  /** Moves the board by `offset` places. Moving to the top makes it the default. */
  move: (board: Board, offset: number) => Promise<void>;
  makeDefault: (board: Board) => Promise<void>;
  /** Refreshes the saved names and spaces from `boards`, since they can change in Jira. */
  refresh: (boards: Board[]) => Promise<void>;
}

const NONE: Board[] = [];

export function usePinnedBoards(): PinnedBoards {
  const key = `pinned-boards:${sourceKey()}`;
  const value = useSyncExternalStore(subscribe, () => saved.get(key));
  useEffect(() => {
    void load(key);
  }, [key]);

  const boards = value ?? NONE;
  const without = (board: Board) => boards.filter((entry) => entry.id !== board.id);

  return {
    ready: value !== undefined,
    boards,
    isPinned: (board) => boards.some((entry) => entry.id === board.id),
    pin: (board) => save(key, [...without(board), board]),
    unpin: (board) => save(key, without(board)),
    async move(board, offset) {
      const from = boards.findIndex((entry) => entry.id === board.id);
      if (from < 0) return;
      const next = without(board);
      next.splice(Math.max(0, Math.min(next.length, from + offset)), 0, board);
      await save(key, next);
    },
    makeDefault: (board) => save(key, [board, ...without(board)]),
    async refresh(fresh) {
      const byId = new Map(fresh.map((board) => [board.id, board]));
      const next = boards.map((board) => byId.get(board.id) ?? board);
      if (JSON.stringify(next) !== JSON.stringify(boards)) await save(key, next);
    },
  };
}

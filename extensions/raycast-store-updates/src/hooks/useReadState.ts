import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useEffect, useState, useCallback, useRef } from "react";

const READ_ITEMS_KEY = "read-items";

interface UndoAction {
  type: "markOne" | "markAll";
  itemIds: string[];
}

/**
 * Hook to manage read/unread state of store items.
 * Uses LocalStorage for persistence. Supports undo for the last action.
 */
export function useReadState(enabled: boolean) {
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const lastAction = useRef<UndoAction | null>(null);

  // Load from LocalStorage on mount
  useEffect(() => {
    if (!enabled) return;
    LocalStorage.getItem<string>(READ_ITEMS_KEY).then((stored) => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as string[];
          setReadIds(new Set(parsed));
        } catch {
          // ignore
        }
      }
      setLoaded(true);
    });
  }, [enabled]);

  const persist = useCallback(async (ids: Set<string>) => {
    await LocalStorage.setItem(READ_ITEMS_KEY, JSON.stringify([...ids]));
  }, []);

  const isRead = useCallback(
    (itemId: string): boolean => {
      if (!enabled) return false;
      return readIds.has(itemId);
    },
    [enabled, readIds],
  );

  const markAsRead = useCallback(
    async (itemId: string) => {
      if (!enabled) return;
      lastAction.current = { type: "markOne", itemIds: [itemId] };
      const updated = new Set(readIds);
      updated.add(itemId);
      setReadIds(updated);
      await persist(updated);
      await showToast({
        style: Toast.Style.Success,
        title: "Marked as Read",
        message: "Press ⌘Z to undo",
      });
    },
    [enabled, readIds, persist],
  );

  const markAllAsRead = useCallback(
    async (itemIds: string[]) => {
      if (!enabled) return;
      // Only track newly-read items (not already read)
      const newlyRead = itemIds.filter((id) => !readIds.has(id));
      lastAction.current = { type: "markAll", itemIds: newlyRead };
      const updated = new Set(readIds);
      for (const id of itemIds) updated.add(id);
      setReadIds(updated);
      await persist(updated);
      await showToast({
        style: Toast.Style.Success,
        title: `Marked ${newlyRead.length} Items as Read`,
        message: "Press ⌘Z to undo",
      });
    },
    [enabled, readIds, persist],
  );

  const undo = useCallback(async () => {
    if (!enabled || !lastAction.current) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Nothing to Undo",
      });
      return;
    }
    const action = lastAction.current;
    lastAction.current = null;
    const updated = new Set(readIds);
    for (const id of action.itemIds) {
      updated.delete(id);
    }
    setReadIds(updated);
    await persist(updated);
    const count = action.itemIds.length;
    await showToast({
      style: Toast.Style.Success,
      title: count === 1 ? "Unmarked as Read" : `Unmarked ${count} Items as Read`,
    });
  }, [enabled, readIds, persist]);

  return {
    isRead,
    markAsRead,
    markAllAsRead,
    undo,
    loaded,
  };
}

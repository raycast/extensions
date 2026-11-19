import { Toast, showToast } from "@raycast/api";
import { MoveDirection } from "../types";
import { useLocalStorage } from "./useLocalStorage";

/** Ordered list of pinned item IDs, persisted under `storageKey`. */
export function usePinned<T extends { id: string }>(storageKey: string, getTitle: (item: T) => string) {
  const { data: pinnedIds, setData: setPinnedIds, isLoading } = useLocalStorage<string[]>(storageKey, []);

  async function togglePin(item: T) {
    if (pinnedIds.includes(item.id)) {
      setPinnedIds(pinnedIds.filter((id) => id !== item.id));
      await showToast(Toast.Style.Success, `Unpinned ${getTitle(item)}`);
    } else {
      setPinnedIds([...pinnedIds, item.id]);
      await showToast(Toast.Style.Success, `Pinned ${getTitle(item)}`);
    }
  }

  async function move(item: T, direction: MoveDirection) {
    const index = pinnedIds.indexOf(item.id);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || target < 0 || target >= pinnedIds.length) return;

    const next = [...pinnedIds];
    [next[index], next[target]] = [next[target], next[index]];
    setPinnedIds(next);

    await showToast(Toast.Style.Success, `Moved ${direction} ${getTitle(item)}`);
  }

  function getMoveDirections(item: T) {
    const index = pinnedIds.indexOf(item.id);
    return { up: index > 0, down: index < pinnedIds.length - 1 };
  }

  return { pinnedIds, isLoading, togglePin, move, getMoveDirections };
}

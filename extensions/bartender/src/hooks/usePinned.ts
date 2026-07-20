import { useCachedState } from "@raycast/utils";

export type PinnedMovement = "up" | "down" | "top" | "bottom";
export type PinnedFunctions = {
  move: (item: string, movement: PinnedMovement) => void;
  getAllowedMovements: (item: string) => PinnedMovement[];
  togglePin: (item: string, isPinned?: boolean) => void;
  unpinAll: () => void;
  replace: (oldItem: string, newItem: string) => void;
};

type MovementResult = { canMove: true; currentIndex: number; targetIndex: number } | { canMove: false };

function getMovementDetails(items: string[], item: string, movement: PinnedMovement): MovementResult {
  const index = items.indexOf(item);
  if (index === -1) return { canMove: false };

  switch (movement) {
    case "up":
      return index > 0 ? { canMove: true, currentIndex: index, targetIndex: index - 1 } : { canMove: false };
    case "down":
      return index < items.length - 1
        ? { canMove: true, currentIndex: index, targetIndex: index + 1 }
        : { canMove: false };
    case "top":
      return index > 0 ? { canMove: true, currentIndex: index, targetIndex: 0 } : { canMove: false };
    case "bottom":
      return index < items.length - 1
        ? { canMove: true, currentIndex: index, targetIndex: items.length - 1 }
        : { canMove: false };
    default:
      return movement satisfies never;
  }
}

function moveItem(items: string[], movementResult: MovementResult): string[] {
  if (!movementResult.canMove) return items;

  const { currentIndex, targetIndex } = movementResult;

  const newItems = [...items];
  const removedItem = newItems.splice(currentIndex, 1)[0];
  newItems.splice(targetIndex, 0, removedItem);
  return newItems;
}

function computeAllowedMovement(items: string[], item: string): PinnedMovement[] {
  const movements: PinnedMovement[] = [];

  if (getMovementDetails(items, item, "up").canMove) {
    movements.push("up", "top");
  }

  if (getMovementDetails(items, item, "down").canMove) {
    movements.push("down", "bottom");
  }

  return movements;
}

type PinnedResult = {
  pinned: string[];
} & PinnedFunctions;

export function usePinned(cacheKey: string): PinnedResult {
  if (!cacheKey) {
    throw new Error("Empty cacheKey provided to usePinned");
  }

  const [items, setItems] = useCachedState<string[]>(cacheKey, [], {
    cacheNamespace: "pinned",
  });

  return {
    pinned: items,

    togglePin: (item: string, isPinned?: boolean) =>
      setItems((previousItems) => {
        const isCurrentlyPinned = previousItems.includes(item);
        const targetPinState = isPinned !== undefined ? isPinned : !isCurrentlyPinned;

        if (targetPinState === isCurrentlyPinned) return previousItems;

        return targetPinState ? [item, ...previousItems] : previousItems.filter((i) => i !== item);
      }),

    unpinAll: () => setItems([]),

    move: (item: string, movement: PinnedMovement) => {
      setItems((previousItems) => {
        const result = getMovementDetails(previousItems, item, movement);
        return moveItem(previousItems, result);
      });
    },

    getAllowedMovements: (item: string) => computeAllowedMovement(items, item),

    replace: (oldItem: string, newItem: string) => {
      setItems((previousItems) => {
        const index = previousItems.indexOf(oldItem);
        if (index === -1) return previousItems;
        if (previousItems.includes(newItem)) return previousItems;

        const newItems = [...previousItems];
        newItems[index] = newItem;
        return newItems;
      });
    },
  };
}

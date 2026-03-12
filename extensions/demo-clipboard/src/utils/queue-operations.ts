import { v4 as uuidv4 } from "uuid";
import { QueueItem, QueueState } from "../types";

const CURRENT_VERSION = 1;

/**
 * Create an empty queue with default values
 */
export function createEmptyQueue(): QueueState {
  return {
    items: [],
    currentPosition: 0,
    version: CURRENT_VERSION,
  };
}

/**
 * Get the current item in the queue based on currentPosition
 */
export function getCurrentItem(queue: QueueState): QueueItem | null {
  if (queue.items.length === 0 || queue.currentPosition >= queue.items.length) {
    return null;
  }
  return queue.items[queue.currentPosition];
}

/**
 * Advance the current position after pasting (without removing items)
 */
export function advancePosition(queue: QueueState): QueueState {
  return {
    ...queue,
    currentPosition: queue.currentPosition + 1,
  };
}

/**
 * Reset the position to the beginning of the queue
 */
export function resetToTop(queue: QueueState): QueueState {
  return {
    ...queue,
    currentPosition: 0,
  };
}

/**
 * Add new items to the end of the queue
 */
export function enqueueItems(queue: QueueState, texts: string[]): QueueState {
  const currentLength = queue.items.length;
  const newItems: QueueItem[] = texts.map((text, index) => ({
    id: uuidv4(),
    text,
    createdAt: Date.now(),
    order: currentLength + index,
  }));

  return {
    ...queue,
    items: [...queue.items, ...newItems],
  };
}

/**
 * Add a single empty item to the end of the queue
 */
export function addEmptyItem(queue: QueueState): QueueState {
  const newItem: QueueItem = {
    id: uuidv4(),
    text: "",
    createdAt: Date.now(),
    order: queue.items.length,
  };

  return {
    ...queue,
    items: [...queue.items, newItem],
  };
}

/**
 * Insert a new item at a specific index, shifting subsequent items down.
 * Adjusts currentPosition if the insertion is at or before it.
 */
export function insertItemAt(queue: QueueState, index: number, text = ""): QueueState {
  const clamped = Math.max(0, Math.min(index, queue.items.length));
  const newItem: QueueItem = {
    id: uuidv4(),
    text,
    createdAt: Date.now(),
    order: clamped,
  };

  const items = [...queue.items];
  items.splice(clamped, 0, newItem);
  items.forEach((item, idx) => {
    item.order = idx;
  });

  const newPosition = clamped <= queue.currentPosition ? queue.currentPosition + 1 : queue.currentPosition;

  return { ...queue, items, currentPosition: newPosition };
}

/**
 * Move an item up in the queue (decrease order number)
 */
export function moveItemUp(queue: QueueState, itemId: string): QueueState {
  const items = [...queue.items];
  const index = items.findIndex((item) => item.id === itemId);

  if (index <= 0) {
    return queue; // Already at top or not found
  }

  // Swap with previous item
  [items[index - 1], items[index]] = [items[index], items[index - 1]];

  // Recalculate order values
  items.forEach((item, idx) => {
    item.order = idx;
  });

  return { ...queue, items };
}

/**
 * Move an item down in the queue (increase order number)
 */
export function moveItemDown(queue: QueueState, itemId: string): QueueState {
  const items = [...queue.items];
  const index = items.findIndex((item) => item.id === itemId);

  if (index === -1 || index >= items.length - 1) {
    return queue; // Already at bottom or not found
  }

  // Swap with next item
  [items[index], items[index + 1]] = [items[index + 1], items[index]];

  // Recalculate order values
  items.forEach((item, idx) => {
    item.order = idx;
  });

  return { ...queue, items };
}

/**
 * Update the text of an existing item
 */
export function updateItemText(queue: QueueState, itemId: string, newText: string): QueueState {
  const items = queue.items.map((item) => {
    if (item.id === itemId) {
      return { ...item, text: newText };
    }
    return item;
  });

  return { ...queue, items };
}

/**
 * Remove a specific item from the queue
 */
export function removeItem(queue: QueueState, itemId: string): QueueState {
  const removedIndex = queue.items.findIndex((item) => item.id === itemId);
  if (removedIndex === -1) {
    return queue;
  }

  const items = queue.items.filter((item) => item.id !== itemId);

  // Recalculate order values
  items.forEach((item, idx) => {
    item.order = idx;
  });

  // Adjust currentPosition if necessary
  let newPosition = queue.currentPosition;
  if (removedIndex < queue.currentPosition) {
    // Item before current position was removed, decrement position
    newPosition = Math.max(0, queue.currentPosition - 1);
  } else if (newPosition >= items.length && items.length > 0) {
    // Position is now beyond the end, move to last item
    newPosition = items.length - 1;
  }

  return { ...queue, items, currentPosition: newPosition };
}

/**
 * Clear all items from the queue
 */
export function clearQueue(): QueueState {
  return createEmptyQueue();
}

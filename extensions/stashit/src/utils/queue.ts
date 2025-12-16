import { LocalStorage } from "@raycast/api";

export interface QueueItem {
  id: string;
  text: string;
  priority: number;
  queue: string;
  createdAt: number;
  poppedAt?: number;
}

const STORAGE_KEY = "stashit-items";
const ARCHIVE_KEY = "stashit-archive";
const DEFAULT_QUEUE = "default";

export async function getQueue(): Promise<QueueItem[]> {
  const data = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!data) return [];
  return JSON.parse(data) as QueueItem[];
}

export async function saveQueue(queue: QueueItem[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export async function getArchive(): Promise<QueueItem[]> {
  const data = await LocalStorage.getItem<string>(ARCHIVE_KEY);
  if (!data) return [];
  return JSON.parse(data) as QueueItem[];
}

export async function saveArchive(archive: QueueItem[]): Promise<void> {
  await LocalStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive));
}

export function parseItemWithPriority(input: string): {
  text: string;
  priority: number;
  queue: string;
} {
  let text = input.trim();
  let priority = 0;
  let queue = DEFAULT_QUEUE;

  // Match priority ANYWHERE: -10 (dash followed by number)
  const priorityMatch = text.match(/-(\d+)/);
  if (priorityMatch) {
    priority = parseInt(priorityMatch[1], 10);
    text = text.replace(/-\d+/, "").trim();
  }

  // Match #queue-name pattern (must contain at least one letter, can have numbers, hyphens, underscores)
  const queueMatch = text.match(/#([a-zA-Z0-9_-]*[a-zA-Z][a-zA-Z0-9_-]*)/);
  if (queueMatch) {
    queue = queueMatch[1].toLowerCase();
    text = text.replace(/#[a-zA-Z0-9_-]*[a-zA-Z][a-zA-Z0-9_-]*/, "").trim();
  }

  // Clean up extra spaces
  text = text.replace(/\s+/g, " ").trim();

  return { text, priority, queue };
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export async function addItem(input: string): Promise<QueueItem> {
  const { text, priority, queue: queueName } = parseItemWithPriority(input);
  const queue = await getQueue();

  const newItem: QueueItem = {
    id: generateId(),
    text,
    priority,
    queue: queueName,
    createdAt: Date.now(),
  };

  queue.push(newItem);
  await saveQueue(queue);

  return newItem;
}

export async function popItem(queueName?: string): Promise<QueueItem | null> {
  const queue = await getQueue();

  // Filter by queue if specified
  const targetQueue = queueName || DEFAULT_QUEUE;
  const filteredQueue = queue.filter((item) => item.queue === targetQueue);

  if (filteredQueue.length === 0) {
    return null;
  }

  // Sort by priority (highest first), then by createdAt (oldest first for same priority)
  filteredQueue.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return a.createdAt - b.createdAt;
  });

  const popped = filteredQueue[0];

  // Remove from main queue
  const index = queue.findIndex((item) => item.id === popped.id);
  queue.splice(index, 1);

  // Archive the popped item
  popped.poppedAt = Date.now();
  const archive = await getArchive();
  archive.unshift(popped);
  await saveArchive(archive);

  await saveQueue(queue);

  return popped;
}

export async function popHighestFromAnyQueue(): Promise<QueueItem | null> {
  const queue = await getQueue();

  if (queue.length === 0) {
    return null;
  }

  // Sort all items by priority (highest first), then by createdAt
  queue.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return a.createdAt - b.createdAt;
  });

  const popped = queue[0];

  // Remove from queue
  queue.shift();

  // Archive the popped item
  popped.poppedAt = Date.now();
  const archive = await getArchive();
  archive.unshift(popped);
  await saveArchive(archive);

  await saveQueue(queue);

  return popped;
}

export async function getSortedQueue(): Promise<QueueItem[]> {
  const queue = await getQueue();

  // Sort by priority (highest first), then by createdAt (oldest first for same priority)
  return queue.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return a.createdAt - b.createdAt;
  });
}

export async function getQueueNames(): Promise<string[]> {
  const queue = await getQueue();
  const names = new Set(queue.map((item) => item.queue));
  return Array.from(names).sort();
}

export async function getItemsByQueue(queueName: string): Promise<QueueItem[]> {
  const queue = await getQueue();
  return queue
    .filter((item) => item.queue === queueName)
    .sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.createdAt - b.createdAt;
    });
}

export async function removeItem(id: string): Promise<boolean> {
  const queue = await getQueue();
  const index = queue.findIndex((item) => item.id === id);

  if (index === -1) {
    return false;
  }

  queue.splice(index, 1);
  await saveQueue(queue);

  return true;
}

export async function popItemById(id: string): Promise<QueueItem | null> {
  const queue = await getQueue();
  const index = queue.findIndex((item) => item.id === id);

  if (index === -1) {
    return null;
  }

  const [popped] = queue.splice(index, 1);

  // Archive the popped item
  popped.poppedAt = Date.now();
  const archive = await getArchive();
  archive.unshift(popped);
  await saveArchive(archive);

  await saveQueue(queue);

  return popped;
}

export async function restoreItem(id: string): Promise<boolean> {
  const archive = await getArchive();
  const index = archive.findIndex((item) => item.id === id);

  if (index === -1) {
    return false;
  }

  const [item] = archive.splice(index, 1);
  delete item.poppedAt;

  const queue = await getQueue();
  queue.push(item);

  await saveQueue(queue);
  await saveArchive(archive);

  return true;
}

export async function clearArchive(): Promise<void> {
  await saveArchive([]);
}

export async function deleteQueueByName(queueName: string): Promise<number> {
  const queue = await getQueue();
  const initialLength = queue.length;
  const filtered = queue.filter((item) => item.queue !== queueName);
  await saveQueue(filtered);
  return initialLength - filtered.length;
}

export async function updateItem(
  id: string,
  updates: { text?: string; priority?: number; queue?: string },
): Promise<QueueItem | null> {
  const queue = await getQueue();
  const index = queue.findIndex((item) => item.id === id);

  if (index === -1) {
    return null;
  }

  const item = queue[index];
  if (updates.text !== undefined) item.text = updates.text;
  if (updates.priority !== undefined) item.priority = updates.priority;
  if (updates.queue !== undefined) item.queue = updates.queue;

  await saveQueue(queue);
  return item;
}

export async function getItemById(id: string): Promise<QueueItem | null> {
  const queue = await getQueue();
  return queue.find((item) => item.id === id) || null;
}

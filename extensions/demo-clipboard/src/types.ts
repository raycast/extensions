/**
 * Represents a single item in the demo clipboard queue
 */
export interface QueueItem {
  id: string; // Unique identifier (UUID)
  text: string; // Content to paste
  createdAt: number; // Timestamp (Date.now())
  order: number; // Position in queue (0-indexed)
}

/**
 * The complete queue state
 */
export interface QueueState {
  items: QueueItem[]; // Array of queue items, sorted by order
  currentPosition: number; // Current position in queue (0-indexed)
  version: number; // Schema version for future migrations
}

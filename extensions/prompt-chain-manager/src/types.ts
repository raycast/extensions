/**
 * Interface representing a single chunk in the prompt chain.
 */
export interface PromptChunk {
  /** Unique identifier for the chunk (using UUID v4). */
  id: string;
  /** User-provided header/description for the chunk. Can be empty. */
  header: string;
  /** The actual text content of the chunk. */
  content: string;
  /** Whether this chunk should be included in the final copied output. */
  enabled: boolean;
  /** Timestamp (milliseconds since epoch) when the chunk was created. */
  createdAt: number;
}

// Constants
export const CACHE_FRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
export const GRID_INITIAL_LOAD = 24; // 6 rows × 4 columns
export const FETCH_CONCURRENCY = 3; // Reduced concurrent API requests to avoid rate limiting
export const BATCH_DELAY_MS = 1000; // Delay between batches to avoid rate limiting

/**
 * Rate-limited batch processor that adds delays between batches.
 * This helps avoid API rate limits on first run when fetching many items.
 */
export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: {
    concurrency?: number;
    delayBetweenBatches?: number;
    onProgress?: (current: number, total: number) => void;
    onBatchComplete?: (results: R[]) => void;
  } = {},
): Promise<R[]> {
  const {
    concurrency = FETCH_CONCURRENCY,
    delayBetweenBatches = BATCH_DELAY_MS,
    onProgress,
    onBatchComplete,
  } = options;

  const results: R[] = [];

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);

    // Add delay between batches (but not before the first batch)
    if (i > 0 && delayBetweenBatches > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
    }

    const batchResults = await Promise.allSettled(
      batch.map((item) => processor(item)),
    );

    const successfulResults: R[] = [];
    batchResults.forEach((result) => {
      if (result.status === "fulfilled") {
        results.push(result.value);
        successfulResults.push(result.value);
      }
    });

    if (onBatchComplete) {
      onBatchComplete(successfulResults);
    }

    if (onProgress) {
      onProgress(Math.min(i + concurrency, items.length), items.length);
    }
  }

  return results;
}

/**
 * Estimate time for batch processing based on item count.
 * Returns human-readable string like "about 30 seconds" or "about 2 minutes"
 */
export function estimateBatchTime(
  itemCount: number,
  concurrency = FETCH_CONCURRENCY,
  delayMs = BATCH_DELAY_MS,
): string {
  if (itemCount === 0) return "instantly";

  const batches = Math.ceil(itemCount / concurrency);
  // Estimate ~500ms per API call + delay between batches
  const estimatedMs = batches * 500 + (batches - 1) * delayMs;
  const seconds = Math.ceil(estimatedMs / 1000);

  if (seconds < 10) return "a few seconds";
  if (seconds < 60) return `about ${Math.ceil(seconds / 10) * 10} seconds`;
  const minutes = Math.ceil(seconds / 60);
  return `about ${minutes} minute${minutes > 1 ? "s" : ""}`;
}

// Date formatting utilities

/**
 * Formats a date string to a relative time string (e.g., "Today", "2 days ago", "Jan 15")
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Formats a number with K/M suffixes for readability
 */
export function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

/**
 * Formats total duration in seconds to a human-readable string (e.g., "2h 30m", "45m", "30s")
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  }
  return `${secs}s`;
}

// Transcript formatting utilities

/**
 * Formats seconds to [MM:SS] timestamp format
 */
function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `[${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}]`;
}

/**
 * Formats seconds to SRT time format (HH:MM:SS,mmm)
 */
function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
}

/**
 * Formats transcript with timestamps like [00:15] Hello...
 */
export function formatTranscriptWithTimestamps(transcript: {
  text: string;
  sentences: { text: string; startSeconds: number }[];
}): string {
  if (transcript.sentences && transcript.sentences.length > 0) {
    return transcript.sentences
      .map(
        (sentence) =>
          `${formatTimestamp(sentence.startSeconds)} ${sentence.text}`,
      )
      .join("\n");
  }
  // Fallback to plain text if no sentences available
  return transcript.text;
}

/**
 * Formats transcript as SRT subtitle file format
 */
export function formatTranscriptAsSRT(transcript: {
  text: string;
  sentences: { text: string; startSeconds: number; endSeconds: number }[];
}): string {
  if (!transcript.sentences || transcript.sentences.length === 0) {
    // Fallback: create single subtitle entry for entire transcript
    return `1\n00:00:00,000 --> 00:00:05,000\n${transcript.text}`;
  }

  return transcript.sentences
    .map((sentence, index) => {
      const startTime = formatSRTTime(sentence.startSeconds);
      const endTime = formatSRTTime(sentence.endSeconds);
      return `${index + 1}\n${startTime} --> ${endTime}\n${sentence.text}\n`;
    })
    .join("\n");
}

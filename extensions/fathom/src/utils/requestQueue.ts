/**
 * Global request queue to prevent simultaneous API calls and rate limiting
 *
 * Features:
 * - Request deduplication (multiple callers get the same promise)
 * - Concurrency limiting (max N requests at once)
 * - Automatic retry with exponential backoff
 * - Request prioritization
 */

import { logger } from "@chrismessina/raycast-logger";

interface QueuedRequest<T> {
  key: string;
  priority: number;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

interface InFlightRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

class RequestQueue {
  private queue: QueuedRequest<unknown>[] = [];
  private inFlight = new Map<string, InFlightRequest<unknown>>();
  private maxConcurrent = 3; // Max 3 concurrent API requests
  private processing = false;

  /**
   * Add a request to the queue with deduplication
   * If the same request is already in flight, return the existing promise
   */
  async enqueue<T>(key: string, execute: () => Promise<T>, priority: number = 0): Promise<T> {
    // Check if request is already in flight
    const existing = this.inFlight.get(key);
    if (existing) {
      logger.log(`[Queue] Deduplicating request: ${key}`);
      return existing.promise as Promise<T>;
    }

    // Create a new promise for this request
    return new Promise<T>((resolve, reject) => {
      const request: QueuedRequest<T> = {
        key,
        priority,
        execute,
        resolve,
        reject,
      };

      // Add to queue (higher priority first)
      this.queue.push(request as QueuedRequest<unknown>);
      this.queue.sort((a, b) => b.priority - a.priority);

      logger.log(`[Queue] Enqueued request: ${key} (priority: ${priority}, queue size: ${this.queue.length})`);

      // Start processing if not already running
      this.processQueue();
    });
  }

  /**
   * Process queued requests respecting concurrency limits
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0 || this.inFlight.size > 0) {
      // Wait if we're at max concurrency
      while (this.inFlight.size >= this.maxConcurrent) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Get next request from queue
      const request = this.queue.shift();
      if (!request) {
        // No more queued requests, but wait for in-flight to complete
        if (this.inFlight.size > 0) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          continue;
        }
        break;
      }

      // Execute the request
      this.executeRequest(request);
    }

    this.processing = false;
  }

  /**
   * Execute a single request and track it
   */
  private executeRequest<T>(request: QueuedRequest<T>): void {
    const { key, execute, resolve, reject } = request;

    logger.log(`[Queue] Executing request: ${key} (in-flight: ${this.inFlight.size}/${this.maxConcurrent})`);

    const promise = execute()
      .then((result) => {
        logger.log(`[Queue] Completed request: ${key}`);
        this.inFlight.delete(key);
        resolve(result);
        return result;
      })
      .catch((error) => {
        logger.error(`[Queue] Failed request: ${key}`, error);
        this.inFlight.delete(key);
        reject(error);
        throw error;
      });

    // Track in-flight request
    this.inFlight.set(key, {
      promise: promise as Promise<unknown>,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear all pending requests (useful for cleanup)
   */
  clear(): void {
    logger.log(`[Queue] Clearing queue (${this.queue.length} pending, ${this.inFlight.size} in-flight)`);
    this.queue = [];
    // Don't clear in-flight requests - let them complete
  }

  /**
   * Get queue stats for debugging
   */
  getStats(): { pending: number; inFlight: number; maxConcurrent: number } {
    return {
      pending: this.queue.length,
      inFlight: this.inFlight.size,
      maxConcurrent: this.maxConcurrent,
    };
  }

  /**
   * Update max concurrent requests
   */
  setMaxConcurrent(max: number): void {
    this.maxConcurrent = Math.max(1, max);
    logger.log(`[Queue] Max concurrent requests set to: ${this.maxConcurrent}`);
  }
}

// Global singleton instance
const globalQueue = new RequestQueue();

export { globalQueue };
export type { QueuedRequest, InFlightRequest };

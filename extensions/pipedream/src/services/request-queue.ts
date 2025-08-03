/**
 * Request queue system to prevent API overload and implement exponential backoff
 */

interface QueuedRequest<T = unknown> {
  id: string;
  fn: () => Promise<T>;
  priority: number;
  retryCount: number;
  maxRetries: number;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
}

class RequestQueue {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private queue: QueuedRequest<any>[] = [];
  private processing = false;
  private concurrentRequests = 0;
  private maxConcurrent = 3;
  private baseDelay = 1000; // 1 second base delay
  private maxDelay = 30000; // 30 seconds max delay

  async add<T>(id: string, fn: () => Promise<T>, priority = 0, maxRetries = 3): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const request: QueuedRequest<T> = {
        id,
        fn,
        priority,
        retryCount: 0,
        maxRetries,
        resolve,
        reject,
      };

      // Remove any existing request with the same ID
      this.queue = this.queue.filter((r) => r.id !== id);

      // Add to queue sorted by priority (higher priority first)
      this.queue.push(request);
      this.queue.sort((a, b) => b.priority - a.priority);

      this.process();
    });
  }

  private async process(): Promise<void> {
    if (this.processing || this.concurrentRequests >= this.maxConcurrent) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0 && this.concurrentRequests < this.maxConcurrent) {
      const request = this.queue.shift();
      if (!request) break;

      this.concurrentRequests++;
      this.executeRequest(request);
    }

    this.processing = false;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async executeRequest(request: QueuedRequest<any>): Promise<void> {
    try {
      const result = await request.fn();
      request.resolve(result);
    } catch (error) {
      if (request.retryCount < request.maxRetries) {
        request.retryCount++;

        // Exponential backoff with jitter
        const delay = Math.min(this.baseDelay * Math.pow(2, request.retryCount) + Math.random() * 1000, this.maxDelay);

        setTimeout(() => {
          this.queue.unshift(request); // Add back to front of queue
          this.process();
        }, delay);
      } else {
        request.reject(error);
      }
    } finally {
      this.concurrentRequests--;
      this.process();
    }
  }

  clear(): void {
    this.queue = [];
  }

  size(): number {
    return this.queue.length;
  }
}

export const requestQueue = new RequestQueue();

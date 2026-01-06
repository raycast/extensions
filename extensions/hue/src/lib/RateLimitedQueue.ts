type QueueItem<T> = {
  request: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

export default class RateLimitedQueue {
  private queue: QueueItem<unknown>[] = [];
  private isProcessing = false;
  private readonly requestsPerSecond: number;
  private readonly maxQueueLength?: number;
  private lastRequestTimestamp = 0;

  constructor(requestsPerSecond: number, maxQueueLength?: number) {
    this.requestsPerSecond = requestsPerSecond;
    this.maxQueueLength = maxQueueLength;
  }

  async enqueueRequest<T>(request: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // If queue is at max capacity, reject the oldest request and replace it with the new one
      if (this.maxQueueLength !== undefined && this.queue.length >= this.maxQueueLength) {
        const droppedRequest = this.queue.shift();
        if (droppedRequest) {
          droppedRequest.reject(new Error("Request dropped: queue at max capacity"));
        }
      }

      this.queue.push({ request, resolve: resolve as (value: unknown) => void, reject });

      if (!this.isProcessing) {
        this.processNext();
      }
    });
  }

  private processNext(): void {
    const item = this.queue.shift();
    if (!item) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const timeSinceLastRequest = Date.now() - this.lastRequestTimestamp;
    const delay = Math.max(0, 1000 / this.requestsPerSecond - timeSinceLastRequest);

    setTimeout(async () => {
      this.lastRequestTimestamp = Date.now();
      try {
        const result = await item.request();
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      }
      this.processNext();
    }, delay);
  }
}

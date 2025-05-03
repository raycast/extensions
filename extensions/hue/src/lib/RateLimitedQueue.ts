export default class RateLimitedQueue {
  private queue: (() => Promise<void>)[] = [];
  private isProcessing = false;
  private readonly requestsPerSecond;
  private readonly maxQueueLength;
  private lastRequestTimestamp = 0;

  constructor(requestsPerSecond: number, maxQueueLength?: number | undefined) {
    this.requestsPerSecond = requestsPerSecond;
    this.maxQueueLength = maxQueueLength;
  }

  async enqueueRequest<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.maxQueueLength && this.queue.length > this.maxQueueLength) {
        // Silently drop request
        return;
      }

      this.queue.push(async () => {
        try {
          const result = await request();
          return resolve(result);
        } catch (error) {
          return reject(error);
        } finally {
          this.processNext();
        }
      });

      if (!this.isProcessing) {
        this.processNext();
      }
    });
  }

  private processNext(): void {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const currentTime = Date.now();
    const timeSinceLastRequest = currentTime - this.lastRequestTimestamp;
    const delay = Math.max(0, 1000 / this.requestsPerSecond - timeSinceLastRequest);

    setTimeout(() => {
      const request = this.queue.shift();
      if (request) {
        this.lastRequestTimestamp = Date.now();
        request().then();
      }
    }, delay);
  }
}

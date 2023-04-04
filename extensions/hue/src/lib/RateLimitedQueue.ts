export default class RateLimitedQueue {
  private queue: (() => Promise<void>)[] = [];
  private isProcessing = false;
  private readonly intervalMs = 1000; // 1 request per second
  private lastRequestTimestamp = 0;
  private maxQueueLength = 1;

  async enqueueRequest<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.queue.length > this.maxQueueLength) {
        // Silently drop request
        return;
      }

      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
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
    const delay = Math.max(0, this.intervalMs - timeSinceLastRequest);

    setTimeout(() => {
      const request = this.queue.shift();
      if (request) {
        this.lastRequestTimestamp = Date.now();
        request().then();
      }
    }, delay);
  }
}
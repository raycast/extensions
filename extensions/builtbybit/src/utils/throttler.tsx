/**
 * A class to handle throttling of read and write operations.
 */
class Throttler {
  private readLastRetry: number;
  private readLastRequest: number;

  private writeLastRetry: number;
  private writeLastRequest: number;

  /**
   * Initializes a new instance of the Throttler class.
   */
  constructor() {
    this.readLastRetry = 0;
    this.readLastRequest = Date.now();

    this.writeLastRetry = 0;
    this.writeLastRequest = Date.now();
  }

  /**
   * Sets the retry interval for read operations.
   * @param retry - The retry interval in milliseconds.
   */
  setRead(retry: number): void {
    this.readLastRetry = retry;
    this.readLastRequest = Date.now();
  }

  /**
   * Sets the retry interval for write operations.
   * @param retry - The retry interval in milliseconds.
   */
  setWrite(retry: number): void {
    this.writeLastRetry = retry;
    this.writeLastRequest = Date.now();
  }

  /**
   * Resets the retry interval and request time for read operations.
   */
  resetRead(): void {
    this.readLastRetry = 0;
    this.readLastRequest = Date.now();
  }

  /**
   * Resets the retry interval and request time for write operations.
   */
  resetWrite(): void {
    this.writeLastRetry = 0;
    this.writeLastRequest = Date.now();
  }

  /**
   * Checks if the operations are rate-limited.
   * @param write - A boolean indicating if the check is for write operations.
   * @returns A boolean indicating if the operations are rate-limited.
   */
  isRateLimited(write: boolean): boolean {
    const time = Date.now();
    if (write) {
      return this.writeLastRetry > 0 && time - this.writeLastRequest < this.writeLastRetry;
    } else {
      return this.readLastRetry > 0 && time - this.readLastRequest < this.readLastRetry;
    }
  }

  /**
   * Handle rate limit response from API
   * @param retryAfter - Retry-After header value in seconds
   */
  handleRateLimitResponse(retryAfter?: number): void {
    const now = Date.now();
    const resetTime = retryAfter ? now + retryAfter * 1000 : now + 5 * 60 * 1000; // Default to 5 minutes if no header

    this.readLastRetry = resetTime - now;
    this.writeLastRetry = resetTime - now;
  }

  /**
   * Stalls the execution if required based on the rate limit.
   * @param write - A boolean indicating if the stall check is for write operations.
   * @returns A promise that resolves when the stall is no longer required.
   */
  async stallIfRequired(write: boolean): Promise<void> {
    let stall = true;

    while (stall) {
      const time = Date.now();

      if (write && (await this.stallForHelper(this.writeLastRetry, this.writeLastRequest, time))) {
        continue;
      } else if (write) {
        stall = false;
      }

      if (await this.stallForHelper(this.readLastRetry, this.readLastRequest, time)) {
        continue;
      } else {
        stall = false;
      }
    }
  }

  /**
   * Helper function to determine if stalling is required.
   * @param lastRetry - The last retry interval in milliseconds.
   * @param lastRequest - The last request time in milliseconds.
   * @param time - The current time in milliseconds.
   * @returns A promise that resolves to a boolean indicating if stalling is required.
   */
  private async stallForHelper(lastRetry: number, lastRequest: number, time: number): Promise<boolean> {
    if (lastRetry > 0 && time - lastRequest < lastRetry) {
      const stallFor = lastRetry - (time - lastRequest);
      await new Promise((resolve) => setTimeout(resolve, stallFor));
      return true;
    } else {
      return false;
    }
  }
}

export default Throttler;

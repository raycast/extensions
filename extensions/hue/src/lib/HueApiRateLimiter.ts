const RATE_LIMIT_WINDOW_MS = 1000;

type Endpoint = string;
type Timestamps = number[];

/**
 * Hue API rate limiter
 *
 * The Hue API has a rate limit of 10 requests per second for lights and 1 request per second for all other endpoints.
 */
export default class HueApiRateLimiter {
  private readonly requests: Map<Endpoint, Timestamps>;

  constructor() {
    this.requests = new Map();
  }

  private removeOldTimestamps(endpoint: string, requests: Map<Endpoint, Timestamps>): void {
    const timestamps = requests.get(endpoint) || [];
    const filteredTimestamps = timestamps.filter((timestamp) => Date.now() - timestamp <= RATE_LIMIT_WINDOW_MS);
    this.requests.set(endpoint, filteredTimestamps);
  }

  private addTimestamp(endpoint: string, requests: Map<Endpoint, Timestamps>): void {
    const timestamps = requests.get(endpoint) || [];
    timestamps.push(Date.now());
    this.requests.set(endpoint, timestamps);
  }

  canMakeRequest(endpoint: string): boolean {
    this.removeOldTimestamps(endpoint, this.requests);
    const timestamps = this.requests.get(endpoint) || [];
    const isLightEndpoint = endpoint.startsWith("/clip/v2/resource/light");
    const rateLimit = isLightEndpoint ? 10 : 1;

    if (timestamps.length >= rateLimit) {
      return false;
    }

    this.addTimestamp(endpoint, this.requests);
    return true;
  }
}

type ClientConstructor<T> = new (config: Record<string, unknown>) => T;

/**
 * Cache key for AWS clients, includes profile and region for proper isolation.
 */
export function getClientCacheKey(regionOverride?: string): string {
  const profile = process.env.AWS_PROFILE ?? process.env.AWS_VAULT ?? "default";
  const region = regionOverride ?? process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "us-east-1";
  return `${profile}:${region}`;
}

/**
 * Generic client cache with type safety.
 */
class ClientCache {
  private clients: Map<string, Map<string, unknown>> = new Map();

  /**
   * Gets or creates a cached client instance.
   *
   * @param ClientClass - The AWS SDK client constructor
   * @param serviceName - Name of the service for cache key
   * @param regionOverride - Optional region override for region-specific clients
   */
  getClient<T>(ClientClass: ClientConstructor<T>, serviceName: string, regionOverride?: string): T {
    const cacheKey = getClientCacheKey(regionOverride);

    if (!this.clients.has(cacheKey)) {
      this.clients.set(cacheKey, new Map());
    }

    const profileClients = this.clients.get(cacheKey);

    if (!profileClients?.has(serviceName)) {
      const config: Record<string, unknown> = {};
      if (regionOverride) {
        config.region = regionOverride;
      }
      profileClients?.set(serviceName, new ClientClass(config));
    }

    return profileClients?.get(serviceName) as T;
  }

  clearAll(): void {
    this.clients.clear();
  }

  clearCurrent(): void {
    const cacheKey = getClientCacheKey();
    this.clients.delete(cacheKey);
  }
}

export const clientCache = new ClientCache();

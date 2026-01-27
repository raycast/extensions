import { UsageData, ProviderCapabilities, ProviderStatus } from "../types";
import { cache } from "../utils/storage";

export abstract class BaseProvider {
  // Identity
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly icon: string;
  abstract readonly defaultEnabled: boolean;

  // Capabilities
  abstract readonly capabilities: ProviderCapabilities;

  // State
  protected usageData: UsageData | null = null;
  protected lastFetchTime: Date | null = null;
  protected error: Error | null = null;
  protected status: ProviderStatus = "not_configured";

  // Cache TTL in milliseconds (default 5 minutes)
  protected readonly cacheTTL = 5 * 60 * 1000;

  // Core methods
  abstract isConfigured(): Promise<boolean>;
  abstract isAuthenticated(): Promise<boolean>;
  abstract fetchUsage(): Promise<UsageData>;
  abstract authenticate(): Promise<boolean>;
  abstract disconnect(): Promise<void>;

  // Getters
  getUsage(): UsageData | null {
    return this.usageData;
  }

  getLastFetchTime(): Date | null {
    return this.lastFetchTime;
  }

  getError(): Error | null {
    return this.error;
  }

  getStatus(): ProviderStatus {
    return this.status;
  }

  isStale(maxAgeMs: number = this.cacheTTL): boolean {
    if (!this.lastFetchTime) return true;
    return Date.now() - this.lastFetchTime.getTime() > maxAgeMs;
  }

  // Helper methods
  protected async getCachedOrFetch<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
    const cached = await cache.get<T>(key);
    if (cached) {
      return cached;
    }

    const data = await fetchFn();
    await cache.set(key, data, this.cacheTTL);
    return data;
  }

  protected createUsageData(params: {
    provider: string;
    primaryUsed: number;
    primaryLimit: number;
    secondaryUsed?: number;
    secondaryLimit?: number;
    resetRelativeTime?: string;
    accountEmail?: string;
    plan?: string;
  }): UsageData {
    const primaryRemaining = Math.max(0, params.primaryLimit - params.primaryUsed);
    const primaryRatio = params.primaryLimit > 0 ? params.primaryUsed / params.primaryLimit : 0;

    const usage: UsageData = {
      provider: params.provider,
      timestamp: new Date(),
      primary: {
        used: params.primaryUsed,
        limit: params.primaryLimit,
        remaining: primaryRemaining,
        usedRatio: primaryRatio,
      },
    };

    if (params.secondaryUsed !== undefined && params.secondaryLimit !== undefined) {
      const secondaryRemaining = Math.max(0, params.secondaryLimit - params.secondaryUsed);
      const secondaryRatio =
        params.secondaryLimit > 0 ? params.secondaryUsed / params.secondaryLimit : 0;
      usage.secondary = {
        used: params.secondaryUsed,
        limit: params.secondaryLimit,
        remaining: secondaryRemaining,
        usedRatio: secondaryRatio,
      };
    }

    if (params.resetRelativeTime) {
      usage.reset = {
        relativeTime: params.resetRelativeTime,
      };
    }

    if (params.accountEmail || params.plan) {
      usage.account = {
        email: params.accountEmail,
        plan: params.plan,
      };
    }

    return usage;
  }

  protected setError(error: Error): void {
    this.error = error;
    this.status = "error";
    console.error(`[${this.name}] Error:`, error);
  }

  protected clearError(): void {
    this.error = null;
  }

  protected updateStatus(status: ProviderStatus): void {
    this.status = status;
  }

  protected updateLastFetchTime(): void {
    this.lastFetchTime = new Date();
  }
}

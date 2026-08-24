import path from "path";
import { environment, getPreferenceValues } from "@raycast/api";
import {
  loadStoredSubscriptionUsage,
  type LoadSubscriptionUsageOptions,
} from "./subscription-usage-store";
import type { SubscriptionUsageResult } from "./subscription-usage";

export function getSubscriptionUsageStorageDirectory(): string {
  return path.join(environment.supportPath, "subscription-usage-v1");
}

export async function loadClaudeSubscriptionUsage(options?: {
  forceRefresh?: boolean;
  signal?: AbortSignal;
}): Promise<SubscriptionUsageResult> {
  const preferences = getPreferenceValues<Preferences>();
  const storeOptions: LoadSubscriptionUsageOptions = {
    credential: preferences.subscriptionUsageOAuthToken,
    forceRefresh: options?.forceRefresh,
    signal: options?.signal,
  };
  return loadStoredSubscriptionUsage(
    getSubscriptionUsageStorageDirectory(),
    storeOptions,
  );
}

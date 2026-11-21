import path from "path";
import { environment } from "@raycast/api";
import {
  loadStoredSubscriptionUsage,
  type LoadSubscriptionUsageOptions,
} from "./subscription-usage-store";
import type { SubscriptionUsageResult } from "./subscription-usage";
import { loadClaudeSubscriptionCredential } from "./claude-oauth-credential";

export function getSubscriptionUsageStorageDirectory(): string {
  return path.join(environment.supportPath, "subscription-usage-v1");
}

export async function loadClaudeSubscriptionUsage(options?: {
  forceRefresh?: boolean;
  signal?: AbortSignal;
  allowKeychainPrompt?: boolean;
}): Promise<SubscriptionUsageResult> {
  const storeOptions: LoadSubscriptionUsageOptions = {
    credentialProvider: () =>
      loadClaudeSubscriptionCredential({
        allowKeychainPrompt: options?.allowKeychainPrompt,
      }),
    forceRefresh: options?.forceRefresh,
    signal: options?.signal,
  };
  return loadStoredSubscriptionUsage(
    getSubscriptionUsageStorageDirectory(),
    storeOptions,
  );
}

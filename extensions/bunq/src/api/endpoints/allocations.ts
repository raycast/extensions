/**
 * Auto-allocation API endpoints.
 */

import { get, post, del } from "../client";
import type { RequestOptions } from "../client";
import { logger } from "../../lib/logger";

// ============== Types ==============

export interface AutoAllocationRule {
  id: number;
  type: "PERCENTAGE" | "AMOUNT";
  amount?: { value: string; currency: string };
  percentage?: number;
  target_account_id: number;
  description?: string;
  created?: string;
}

export interface AutoAllocationRequest {
  type: "PERCENTAGE" | "AMOUNT";
  amount?: { value: string; currency: string };
  percentage?: number;
  target_account_id: number;
}

// ============== API Functions ==============

/**
 * Get auto-allocation rules for an account.
 */
export async function getAutoAllocations(
  userId: string,
  accountId: number,
  options: RequestOptions,
): Promise<AutoAllocationRule[]> {
  try {
    const response = await get<Record<string, unknown>>(
      `/user/${userId}/monetary-account/${accountId}/automatic-allocation`,
      options,
    );

    if (!Array.isArray(response.Response)) {
      logger.warn("Invalid response structure for auto-allocations");
      return [];
    }
    const rules: AutoAllocationRule[] = [];
    for (const item of response.Response) {
      if ("AutomaticAllocationRule" in (item as Record<string, unknown>)) {
        rules.push((item as { AutomaticAllocationRule: AutoAllocationRule }).AutomaticAllocationRule);
      }
    }
    return rules;
  } catch {
    // If the endpoint doesn't exist or returns an error, return empty array
    // (404 is expected - auto-allocation isn't available for all account types)
    return [];
  }
}

/**
 * Create an auto-allocation rule.
 */
export async function createAutoAllocation(
  userId: string,
  accountId: number,
  rule: AutoAllocationRequest,
  options: RequestOptions,
): Promise<number> {
  const response = await post<Record<string, unknown>>(
    `/user/${userId}/monetary-account/${accountId}/automatic-allocation`,
    rule,
    { ...options, sign: true },
  );

  if (!Array.isArray(response.Response)) {
    throw new Error("Invalid response structure for auto-allocation creation");
  }
  for (const item of response.Response) {
    const data = item as { Id?: { id: number } };
    if (data.Id) {
      return data.Id.id;
    }
  }
  throw new Error("No allocation ID received");
}

/**
 * Delete an auto-allocation rule.
 */
export async function deleteAutoAllocation(
  userId: string,
  accountId: number,
  allocationId: number,
  options: RequestOptions,
): Promise<void> {
  await del(`/user/${userId}/monetary-account/${accountId}/automatic-allocation/${allocationId}`, options);
}

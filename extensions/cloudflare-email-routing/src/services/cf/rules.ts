import { EmailRoutingRule } from "cloudflare/resources/email-routing/rules/rules";
import { cloudflare, fetchWithAuth } from "../api/client";
import { getApiConfig } from "../api/config";
import { AliasRule, CloudflareResponse, ParsedAliasMeta } from "../../types";
import {
  APP_RULE_PREFIX,
  SEPARATOR,
  EMPTY_LABEL,
  generateRandomEmail,
  extractDomainFromEmail,
  constructRuleName,
} from "../../utils";
import { Zone } from "cloudflare/resources/zones/zones";
import { Address } from "cloudflare/resources/email-routing/addresses";

// Rate limiting helper
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 5, windowMs: number = 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter((time) => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return this.waitForSlot();
    }

    this.requests.push(now);
  }
}

const rateLimiter = new RateLimiter();

// Unique ID generator to avoid race conditions
let sequenceCounter = 0;
function generateUniqueTimestamp(): number {
  const now = Date.now();
  return now * 1000 + (sequenceCounter++ % 1000);
}

export async function getAccountDomain(): Promise<string> {
  const config = getApiConfig();

  // Get zone information to extract the domain name
  const url = `https://api.cloudflare.com/client/v4/zones/${config.zoneId}`;
  const response = await fetchWithAuth(url);
  const data = (await response.json()) as CloudflareResponse<Zone>;

  if (!data.success) {
    throw new Error(
      `Failed to fetch zone information: ${data.errors?.map((e: { message: string }) => e.message).join(", ") || "Unknown error"}`
    );
  }

  // The zone name is the domain
  return data.result.name;
}

export async function getAllRules(): Promise<EmailRoutingRule[]> {
  const config = getApiConfig();
  const perPage = 50;
  const allRules = [];
  // Auto-pagination: https://github.com/cloudflare/cloudflare-typescript?tab=readme-ov-file#auto-pagination
  for await (const emailRoutingRule of cloudflare.emailRouting.rules.list(config.zoneId, {
    per_page: perPage,
  })) {
    allRules.push(emailRoutingRule);
  }
  return allRules;
}

export async function getUsedAliases(): Promise<AliasRule[]> {
  const allRules = await getAllRules();
  const appRules = allRules.filter((r) => r.name?.startsWith(APP_RULE_PREFIX) && parseRuleName(r.name).label);
  return appRules.map((r) => convertRuleToAlias(r));
}

export async function getUnusedRules(): Promise<AliasRule[]> {
  const allRules = await getAllRules();
  const appRules = allRules.filter((r) => r.name?.startsWith(APP_RULE_PREFIX) && !parseRuleName(r.name).label);
  const result = appRules.map((r) => convertRuleToAlias(r));
  result.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return result;
}

export async function createRule(domain: string): Promise<AliasRule> {
  const config = getApiConfig();

  const email = generateRandomEmail(domain);
  const timestamp = generateUniqueTimestamp();
  const name = constructRuleName(timestamp);

  const url = `https://api.cloudflare.com/client/v4/zones/${config.zoneId}/email/routing/rules`;
  const response = await fetchWithAuth(url, {
    method: "POST",
    body: JSON.stringify({
      name,
      matchers: [
        {
          type: "literal",
          field: "to",
          value: email,
        },
      ],
      actions: [
        {
          type: "forward",
          value: [config.destinationEmail],
        },
      ],
    }),
  });

  const data = (await response.json()) as CloudflareResponse<EmailRoutingRule>;

  if (!data.success) {
    throw new Error(
      `Failed to create rule: ${data.errors?.map((e: { message: string }) => e.message).join(", ") || "Unknown error"}`
    );
  }

  return convertRuleToAlias(data.result);
}

export async function updateRule(id: string, label: string, description?: string): Promise<void> {
  const config = getApiConfig();

  // Get the current rule to preserve email
  const getRuleUrl = `https://api.cloudflare.com/client/v4/zones/${config.zoneId}/email/routing/rules/${id}`;
  const getRuleResponse = await fetchWithAuth(getRuleUrl);
  const getRuleData = (await getRuleResponse.json()) as CloudflareResponse<EmailRoutingRule>;

  if (!getRuleData.success) {
    throw new Error(
      `Failed to get rule: ${getRuleData.errors?.map((e: { message: string }) => e.message).join(", ") || "Unknown error"}`
    );
  }

  const currentRule = getRuleData.result;
  const timestamp = generateUniqueTimestamp();
  const name = constructRuleName(timestamp, label, description);

  const updateUrl = `https://api.cloudflare.com/client/v4/zones/${config.zoneId}/email/routing/rules/${id}`;
  const updateResponse = await fetchWithAuth(updateUrl, {
    method: "PUT",
    body: JSON.stringify({
      name,
      matchers: currentRule.matchers,
      actions: currentRule.actions,
    }),
  });

  const updateData = (await updateResponse.json()) as CloudflareResponse<EmailRoutingRule>;

  if (!updateData.success) {
    throw new Error(
      `Failed to update rule: ${updateData.errors?.map((e: { message: string }) => e.message).join(", ") || "Unknown error"}`
    );
  }
}

export async function deleteRule(id: string): Promise<void> {
  const config = getApiConfig();

  const url = `https://api.cloudflare.com/client/v4/zones/${config.zoneId}/email/routing/rules/${id}`;
  const response = await fetchWithAuth(url, {
    method: "DELETE",
  });
  const data = (await response.json()) as CloudflareResponse<Address>;

  if (!data.success) {
    throw new Error(
      `Failed to delete rule: ${data.errors?.map((e: { message: string }) => e.message).join(", ") || "Unknown error"}`
    );
  }
}

export async function ensurePoolSize(minSize: number = 20): Promise<void> {
  const config = getApiConfig();
  if (!config.preAllocatePool) {
    return;
  }

  const unusedRules = await getUnusedRules();
  const needed = minSize - unusedRules.length;

  if (needed > 0) {
    const domain = extractDomainFromEmail(config.destinationEmail);

    // Create rules in batches to avoid rate limits
    const batchSize = 3;
    const batches = [];

    for (let i = 0; i < needed; i += batchSize) {
      const batchPromises = [];
      const batchEnd = Math.min(i + batchSize, needed);

      for (let j = i; j < batchEnd; j++) {
        batchPromises.push(
          (async () => {
            await rateLimiter.waitForSlot();
            return createRule(domain);
          })()
        );
      }

      batches.push(Promise.all(batchPromises));
    }

    // Execute batches sequentially to spread out the load
    for (const batch of batches) {
      await batch;
    }
  }
}

export function parseRuleName(rawName: string): ParsedAliasMeta {
  const parts = rawName.split(SEPARATOR);
  const rawTimestamp = Number(parts[1]);

  // Handle both old format (milliseconds) and new format (microseconds)
  const timestamp = rawTimestamp > 1e12 ? Math.floor(rawTimestamp / 1000) : rawTimestamp || Date.now();

  const label = parts[2] !== EMPTY_LABEL ? parts[2] : undefined;
  const description = parts[3] !== EMPTY_LABEL ? parts[3] : undefined;

  return {
    timestamp,
    label,
    description,
    email: "", // Will be filled by the converter
  };
}

function convertRuleToAlias(rule: EmailRoutingRule): AliasRule {
  const parsedName = parseRuleName(rule.name!);

  return {
    id: rule.id!,
    name: {
      ...parsedName,
      email: rule.matchers![0].value,
    },
    email: rule.matchers![0].value,
    forwardsToEmail: rule.actions![0].value[0],
    enabled: rule.enabled!,
    createdAt: new Date(parsedName.timestamp),
  };
}

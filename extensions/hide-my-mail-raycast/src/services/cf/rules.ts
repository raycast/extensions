import { EmailRoutingRule } from "cloudflare/resources/email-routing/rules/rules";
import { fetchWithAuth } from "../api/client";
import { getApiConfig } from "../api/config";
import { AliasRule, ParsedAliasMeta } from "../../types";
import {
  APP_RULE_PREFIX,
  SEPARATOR,
  EMPTY_LABEL,
  generateRandomEmail,
  extractDomainFromEmail,
} from "../../utils";

export async function getAccountDomain(): Promise<string> {
  const config = getApiConfig();

  // Get zone information to extract the domain name
  const url = `https://api.cloudflare.com/client/v4/zones/${config.zoneId}`;
  const response = await fetchWithAuth(url);
  const data = await response.json();

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
  const existingRules: EmailRoutingRule[] = [];
  let page = 1;

  while (true) {
    const url = `https://api.cloudflare.com/client/v4/zones/${config.zoneId}/email/routing/rules?per_page=50&page=${page}`;
    const response = await fetchWithAuth(url);
    const data = await response.json();

    if (!data.success) {
      throw new Error(
        `Failed to fetch rules: ${data.errors?.map((e: { message: string }) => e.message).join(", ") || "Unknown error"}`
      );
    }

    page += 1;
    existingRules.push(...data.result);

    if (!data.result_info?.total_count || existingRules.length >= data.result_info.total_count) {
      break;
    }
  }

  return existingRules;
}

export async function getUsedAliases(): Promise<AliasRule[]> {
  const allRules = await getAllRules();
  const appRules = allRules.filter(
    (r) => r.name?.startsWith(APP_RULE_PREFIX) && parseRuleName(r.name).label
  );
  return appRules.map((r) => convertRuleToAlias(r));
}

export async function getUnusedRules(): Promise<AliasRule[]> {
  const allRules = await getAllRules();
  const appRules = allRules.filter(
    (r) => r.name?.startsWith(APP_RULE_PREFIX) && !parseRuleName(r.name).label
  );
  const result = appRules.map((r) => convertRuleToAlias(r));
  result.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return result;
}

export async function createRule(domain: string): Promise<AliasRule> {
  const config = getApiConfig();

  const email = generateRandomEmail(domain);
  const timestamp = Date.now();
  const name = `${APP_RULE_PREFIX}${SEPARATOR}${timestamp}${SEPARATOR}${EMPTY_LABEL}${SEPARATOR}${EMPTY_LABEL}`;

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

  const data = await response.json();

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
  const getRuleData = await getRuleResponse.json();

  if (!getRuleData.success) {
    throw new Error(
      `Failed to get rule: ${getRuleData.errors?.map((e: { message: string }) => e.message).join(", ") || "Unknown error"}`
    );
  }

  const currentRule = getRuleData.result;
  const timestamp = Date.now();
  const name = `${APP_RULE_PREFIX}${SEPARATOR}${timestamp}${SEPARATOR}${label}${SEPARATOR}${description || EMPTY_LABEL}`;

  const updateUrl = `https://api.cloudflare.com/client/v4/zones/${config.zoneId}/email/routing/rules/${id}`;
  const updateResponse = await fetchWithAuth(updateUrl, {
    method: "PUT",
    body: JSON.stringify({
      name,
      matchers: currentRule.matchers,
      actions: currentRule.actions,
    }),
  });

  const updateData = await updateResponse.json();

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

  const data = await response.json();

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
    const promises = Array.from({ length: needed }, () => createRule(domain));
    await Promise.all(promises);
  }
}

export function parseRuleName(rawName: string): ParsedAliasMeta {
  const parts = rawName.split(SEPARATOR);
  const timestamp = Number(parts[1]) || Date.now();
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

import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

interface Preferences {
  serverUrl: string;
  username: string;
  password: string;
}

export interface Status {
  protection_enabled: boolean;
  filtering_enabled: boolean;
  dns_queries: number;
  blocked_today: number;
  protection_disabled_duration?: number; // Duration in milliseconds until protection is re-enabled
  protection_disabled_until?: string; // ISO string of when protection will be re-enabled
}

export interface Stats {
  dns_queries: number;
  blocked_filtering: number;
  replaced_safebrowsing: number;
  replaced_parental: number;
}

export interface QueryLogEntry {
  time: string;
  question: {
    name: string;
    type: string;
  };
  client: string;
  blocked: boolean;
  reason?: string;
}

export interface FilteringRule {
  id: number;
  enabled: boolean;
  url: string;
  name: string;
  rules_count: number;
}

export interface CustomRule {
  enabled: boolean;
  text: string;
}

export interface DetailedStats {
  time_units: string;
  top_clients: Array<Record<string, number>>;
  top_queried_domains: Array<Record<string, number>>;
  top_blocked_domains: Array<Record<string, number>>;
  top_upstreams_responses: Array<Record<string, number>>;
}

const getAuthHeaders = () => {
  const preferences = getPreferenceValues<Preferences>();
  const auth = Buffer.from(`${preferences.username}:${preferences.password}`).toString("base64");
  return {
    Authorization: `Basic ${auth}`,
  };
};

export async function getStatus(): Promise<Status> {
  const preferences = getPreferenceValues<Preferences>();
  const response = await fetch(`${preferences.serverUrl}/control/status`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch status: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

export async function toggleProtection(enabled: boolean): Promise<void> {
  const preferences = getPreferenceValues<Preferences>();
  const response = await fetch(`${preferences.serverUrl}/control/protection`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ enabled }),
  });

  if (!response.ok) {
    throw new Error(`Failed to toggle protection: ${response.statusText}`);
  }
}

export async function disableProtection(duration: number): Promise<void> {
  const preferences = getPreferenceValues<Preferences>();

  const response = await fetch(`${preferences.serverUrl}/control/protection`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      enabled: false,
      duration: duration, // Duration in milliseconds until re-enable
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to disable protection: ${response.statusText}`);
  }
}

export async function getQueryLog(limit = 20): Promise<QueryLogEntry[]> {
  const preferences = getPreferenceValues<Preferences>();
  const url = new URL(`${preferences.serverUrl}/control/querylog`);

  url.searchParams.append("limit", limit.toString());
  url.searchParams.append("offset", "0");

  url.searchParams.append("limit", limit.toString());
  url.searchParams.append("offset", "0");

  const response = await fetch(url.toString(), {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch query log: ${response.statusText}`);
  }

  const data = await response.json();

  if (data && data.data && Array.isArray(data.data)) {
    return data.data.slice(0, limit);
  }

  if (Array.isArray(data)) {
    return data.slice(0, limit);
  }

  return [];
}

export async function getFilteringRules(): Promise<FilteringRule[]> {
  const preferences = getPreferenceValues<Preferences>();
  const response = await fetch(`${preferences.serverUrl}/control/filtering/status`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch filtering rules: ${response.statusText}`);
  }

  return response.json();
}

export async function getCustomRules(): Promise<CustomRule[]> {
  const preferences = getPreferenceValues<Preferences>();
  const url = `${preferences.serverUrl}/control/filtering/status`;

  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch custom rules: ${response.statusText}`);
  }

  const data = await response.json();

  return (
    data.user_rules?.map((rule: string) => ({
      enabled: true,
      text: rule,
    })) || []
  );

  return (
    data.user_rules?.map((rule: string) => ({
      enabled: true,
      text: rule,
    })) || []
  );
}

export async function addCustomRule(rule: string): Promise<void> {
  const preferences = getPreferenceValues<Preferences>();
  const response = await fetch(`${preferences.serverUrl}/control/filtering/set_rules`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ rules: [rule] }),
  });

  if (!response.ok) {
    throw new Error(`Failed to add custom rule: ${response.statusText}`);
  }
}

export async function removeCustomRule(rule: string): Promise<void> {
  // First get existing rules
  const rules = await getCustomRules();
  // Filter out the rule to remove
  const newRules = rules.filter((r) => r.text !== rule);

  const preferences = getPreferenceValues<Preferences>();
  const response = await fetch(`${preferences.serverUrl}/control/filtering/set_rules`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ rules: newRules.map((r) => r.text) }),
  });

  if (!response.ok) {
    throw new Error(`Failed to remove custom rule: ${response.statusText}`);
  }
}

export async function getStats(): Promise<Stats> {
  const preferences = getPreferenceValues<Preferences>();

  const url = `${preferences.serverUrl}/control/stats`;

  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch stats: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    dns_queries: data.num_dns_queries || 0,
    blocked_filtering: data.num_blocked_filtering || 0,
    replaced_safebrowsing: data.num_replaced_safebrowsing || 0,
    replaced_parental: data.num_replaced_parental || 0,
  };
}

export async function getDetailedStats(): Promise<DetailedStats> {
  const preferences = getPreferenceValues<Preferences>();
  const url = `${preferences.serverUrl}/control/stats`;

  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch detailed stats: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    time_units: data.time_units || "hours",
    top_clients: data.top_clients || [],
    top_queried_domains: data.top_queried_domains || [],
    top_blocked_domains: data.top_blocked_domains || [],
    top_upstreams_responses: data.top_upstreams_responses || [],
  };
}

export function getAdGuardHomeUrl(): string {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.serverUrl;
}

/**
 * Accounts Hook
 *
 * Manages multiple Letta accounts (projects) from preferences.
 * Creates Letta clients on-demand to avoid serialization issues.
 */

import { getPreferenceValues } from "@raycast/api";
import { useMemo, useCallback } from "react";
import { Letta } from "@letta-ai/letta-client";
import type { LettaAccount } from "../types";

// Uses auto-generated Preferences type from raycast-env.d.ts

/**
 * Parse preferences into account objects
 */
function parseAccounts(prefs: Preferences): LettaAccount[] {
  const accounts: LettaAccount[] = [];

  if (prefs.project1ApiKey) {
    accounts.push({
      id: "project1",
      name: prefs.project1Name || "Default",
      apiKey: prefs.project1ApiKey,
      baseUrl: prefs.project1BaseUrl || undefined,
    });
  }

  const optionalProjects = [
    {
      id: "project2",
      name: prefs.project2Name,
      apiKey: prefs.project2ApiKey,
      baseUrl: prefs.project2BaseUrl,
    },
    {
      id: "project3",
      name: prefs.project3Name,
      apiKey: prefs.project3ApiKey,
      baseUrl: prefs.project3BaseUrl,
    },
    {
      id: "project4",
      name: prefs.project4Name,
      apiKey: prefs.project4ApiKey,
      baseUrl: prefs.project4BaseUrl,
    },
    {
      id: "project5",
      name: prefs.project5Name,
      apiKey: prefs.project5ApiKey,
      baseUrl: prefs.project5BaseUrl,
    },
  ];

  for (const proj of optionalProjects) {
    if (proj.name && proj.apiKey) {
      accounts.push({
        id: proj.id,
        name: proj.name,
        apiKey: proj.apiKey,
        baseUrl: proj.baseUrl || undefined,
      });
    }
  }

  return accounts;
}

const clientCache = new Map<string, Letta>();

/**
 * Create or get cached Letta client for an account
 */
function getOrCreateClient(account: LettaAccount): Letta {
  const cacheKey = `${account.id}-${account.apiKey}`;
  let client = clientCache.get(cacheKey);

  if (!client) {
    client = new Letta({
      apiKey: account.apiKey,
      ...(account.baseUrl ? { baseUrl: account.baseUrl } : {}),
    });
    clientCache.set(cacheKey, client);
  }

  return client;
}

/**
 * Hook to manage multiple Letta accounts
 */
export function useAccounts() {
  const prefs = getPreferenceValues<Preferences>();

  const accounts = useMemo(
    () => parseAccounts(prefs),
    [
      prefs.project1Name,
      prefs.project1ApiKey,
      prefs.project1BaseUrl,
      prefs.project2Name,
      prefs.project2ApiKey,
      prefs.project2BaseUrl,
      prefs.project3Name,
      prefs.project3ApiKey,
      prefs.project3BaseUrl,
      prefs.project4Name,
      prefs.project4ApiKey,
      prefs.project4BaseUrl,
      prefs.project5Name,
      prefs.project5ApiKey,
      prefs.project5BaseUrl,
    ]
  );

  const getClientForAccount = useCallback(
    (accountId: string): Letta | undefined => {
      const account = accounts.find((a) => a.id === accountId);
      if (!account) return undefined;
      return getOrCreateClient(account);
    },
    [accounts]
  );

  const showReasoning = prefs.showReasoning ?? true;

  return {
    accounts,
    getClientForAccount,
    showReasoning,
  };
}

export function getAccounts(): LettaAccount[] {
  const prefs = getPreferenceValues<Preferences>();
  return parseAccounts(prefs);
}

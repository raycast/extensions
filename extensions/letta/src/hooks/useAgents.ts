/**
 * Agents Hook
 *
 * Fetch and cache agent list from all configured accounts.
 * Tags each agent with account info for multi-account support.
 */

import { useCachedPromise, useLocalStorage } from "@raycast/utils";
import type { Letta } from "@letta-ai/letta-client";
import type { LettaAccount, AgentWithAccount } from "../types";
import { getAgentColor } from "../types";

/**
 * Extended agent summary with account info
 */
export type AgentSummary = {
  id: string;
  name: string;
  description?: string | null;
  accountId: string;
  accountName: string;
};

const STORAGE_KEY_ACTIVE_AGENT = "letta-active-agent-id";

/**
 * Fetch agents from a single account
 */
async function fetchAgentsForAccount(
  client: Letta,
  account: LettaAccount,
  query?: string
): Promise<AgentSummary[]> {
  try {
    console.log(`[Letta] Fetching agents for account: ${account.name}${query ? ` with query: "${query}"` : ""}`);

    // Pass query_text parameter to API for server-side search
    const result = await client.agents.list({
      ...(query ? { query_text: query } : {}),
    });

    // Handle different response shapes from SDK
    let agentsList: Array<{ id: string; name: string; description?: string | null }> = [];

    if (Array.isArray(result)) {
      console.log(`[Letta] Result is array with ${result.length} items`);
      agentsList = result;
    } else if (result && typeof result === "object") {
      const resultObj = result as unknown as Record<string, unknown>;
      console.log(`[Letta] Result is object with keys:`, Object.keys(resultObj));

      // Check for 'body' property (ArrayPage response from SDK)
      if (Array.isArray(resultObj.body)) {
        console.log(`[Letta] Found body array with ${resultObj.body.length} items`);
        agentsList = resultObj.body;
      }
      // Check for 'data' property (alternative response format)
      else if (Array.isArray(resultObj.data)) {
        console.log(`[Letta] Found data array with ${resultObj.data.length} items`);
        agentsList = resultObj.data;
      }
      // Check for async iterator
      else if (Symbol.asyncIterator in result) {
        console.log(`[Letta] Result is async iterable`);
        for await (const agent of result as AsyncIterable<{
          id: string;
          name: string;
          description?: string | null;
        }>) {
          agentsList.push(agent);
        }
      }
    }

    console.log(`[Letta] Parsed ${agentsList.length} agents for ${account.name}`);

    // Map to summary with account info
    return agentsList.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      accountId: account.id,
      accountName: account.name,
    }));
  } catch (error) {
    console.error(`[Letta] Error fetching agents for account ${account.name}:`, error);
    throw error;
  }
}

/**
 * Hook to fetch agents from all configured accounts
 */
export function useAgents(
  accounts: LettaAccount[],
  getClientForAccount: (accountId: string) => Letta | undefined,
  query?: string
) {
  // Fetch agents from all accounts with caching
  const {
    data: agents,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    async (accts: LettaAccount[], searchQuery?: string) => {
      console.log(`[Letta] useAgents called with ${accts.length} accounts, searchQuery: "${searchQuery}"`);

      // Fetch from all accounts in parallel, with individual error handling
      const results = await Promise.all(
        accts.map(async (account) => {
          const client = getClientForAccount(account.id);
          if (!client) {
            console.warn(`[Letta] No client found for account: ${account.name}`);
            return [];
          }
          try {
            return await fetchAgentsForAccount(client, account, searchQuery);
          } catch (err) {
            console.error(`[Letta] Failed to fetch agents for account ${account.name}:`, err);
            return [];
          }
        })
      );

      // Flatten and sort by account name then agent name
      const sorted = results.flat().sort((a, b) => {
        const accountCompare = a.accountName.localeCompare(b.accountName);
        if (accountCompare !== 0) return accountCompare;
        return a.name.localeCompare(b.name);
      });

      console.log(`[Letta] Returning ${sorted.length} agents from useAgents`);
      return sorted;
    },
    [accounts, query],
    {
      keepPreviousData: true,
    }
  );

  // Persist active agent ID in local storage
  const { value: activeAgentId, setValue: setActiveAgentId } = useLocalStorage<string | null>(
    STORAGE_KEY_ACTIVE_AGENT,
    null
  );

  // Find the active agent from the list
  const activeAgent = agents?.find((a) => a.id === activeAgentId) ?? null;

  return {
    agents,
    isLoading,
    error,
    revalidate,
    activeAgent,
    activeAgentId,
    setActiveAgentId,
  };
}

/**
 * Convert agent summaries to AgentWithAccount with colors
 */
export function toAgentsWithAccount(agents: AgentSummary[]): AgentWithAccount[] {
  return agents.map((agent, index) => ({
    id: agent.id,
    name: agent.name,
    description: agent.description,
    color: getAgentColor(agent.id, index),
    accountId: agent.accountId,
    accountName: agent.accountName,
  }));
}

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
async function fetchAgentsForAccount(client: Letta, account: LettaAccount): Promise<AgentSummary[]> {
  try {
    const result = await client.agents.list();

    // Handle different response shapes from SDK
    let agentsList: Array<{ id: string; name: string; description?: string | null }> = [];

    if (Array.isArray(result)) {
      agentsList = result;
    } else if (result && typeof result === "object") {
      const resultObj = result as unknown as Record<string, unknown>;

      if (Array.isArray(resultObj.data)) {
        agentsList = resultObj.data;
      } else if (Symbol.asyncIterator in result) {
        for await (const agent of result as AsyncIterable<{
          id: string;
          name: string;
          description?: string | null;
        }>) {
          agentsList.push(agent);
        }
      }
    }

    // Map to summary with account info
    return agentsList.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      accountId: account.id,
      accountName: account.name,
    }));
  } catch {
    return [];
  }
}

/**
 * Hook to fetch agents from all configured accounts
 */
export function useAgents(accounts: LettaAccount[], getClientForAccount: (accountId: string) => Letta | undefined) {
  // Fetch agents from all accounts with caching
  const {
    data: agents,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    async (accts: LettaAccount[]) => {
      // Fetch from all accounts in parallel
      const results = await Promise.all(
        accts.map((account) => {
          const client = getClientForAccount(account.id);
          if (!client) return Promise.resolve([]);
          return fetchAgentsForAccount(client, account);
        })
      );

      // Flatten and sort by account name then agent name
      return results.flat().sort((a, b) => {
        const accountCompare = a.accountName.localeCompare(b.accountName);
        if (accountCompare !== 0) return accountCompare;
        return a.name.localeCompare(b.name);
      });
    },
    [accounts],
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

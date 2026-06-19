/**
 * Letta Client Hook
 *
 * Provides access to Letta clients for multi-account support.
 * Wraps useAccounts with convenience methods for getting the right client.
 */

import { useAccounts } from "./useAccounts";
import type { Letta } from "@letta-ai/letta-client";
import type { AgentSummary } from "./useAgents";
import type { AgentWithAccount } from "../types";

export function useLettaClient() {
  const { accounts, getClientForAccount, showReasoning } = useAccounts();

  const getClientForAgent = (agent: AgentSummary | AgentWithAccount | { accountId: string }): Letta | undefined => {
    return getClientForAccount(agent.accountId);
  };

  return {
    accounts,
    getClientForAccount,
    getClientForAgent,
    showReasoning,
  };
}

export { useAccounts, getAccounts } from "./useAccounts";

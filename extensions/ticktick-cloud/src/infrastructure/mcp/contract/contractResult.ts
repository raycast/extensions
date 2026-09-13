export const CONTRACT_ENVIRONMENT_ERROR =
  "Set TICKTICK_CONTRACT_TOKEN, TICKTICK_CONTRACT_SOURCE_PROJECT_ID, and TICKTICK_CONTRACT_TARGET_PROJECT_ID before running the authenticated contract suite.";

export interface ContractEnvironment {
  token: string;
  sourceProjectId: string;
  targetProjectId: string;
}

export interface ContractOperationEvidence {
  name: string;
  ok: boolean;
  elapsedMs: number;
}

export interface McpContractResult {
  eligible: boolean;
  inboxProven: boolean;
  snapshotComplete: boolean;
  cleanupSucceeded: boolean;
  syntheticOnly: false;
  toolCount: number;
  projectCount: number;
  taskCount: number;
  duplicateTaskCount: number;
  firstUncachedResponseMs: number;
  operations: ContractOperationEvidence[];
}

export function readContractEnvironment(environment: Record<string, string | undefined>): ContractEnvironment {
  const token = environment.TICKTICK_CONTRACT_TOKEN?.trim();
  const sourceProjectId = environment.TICKTICK_CONTRACT_SOURCE_PROJECT_ID?.trim();
  const targetProjectId = environment.TICKTICK_CONTRACT_TARGET_PROJECT_ID?.trim();

  if (!token || !sourceProjectId || !targetProjectId) throw new Error(CONTRACT_ENVIRONMENT_ERROR);
  if (sourceProjectId === targetProjectId) {
    throw new Error("Use two different TickTick projects for the authenticated contract suite.");
  }

  return { token, sourceProjectId, targetProjectId };
}

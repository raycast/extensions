import type { AgentProcessingParams } from "./index";
import type { CommandSpec } from "@/agents/types";

export interface RunnerState {
  commandSpec: CommandSpec;
  isAdditionalVariant: boolean;
  isFollowUp: boolean;
  executionId: string;
  originalPrompt: string;
  agentId: string;
}

export interface UseAgentRunnerReturn {
  executeCommand: (state: RunnerState) => void;
  createExecutionState: (
    params: AgentProcessingParams,
    isAdditionalVariant: boolean,
    isFollowUp?: boolean,
    executionId?: string
  ) => RunnerState;
  isExecuting: boolean;
  executionData: string | null;
  executionError: Error | null;
}

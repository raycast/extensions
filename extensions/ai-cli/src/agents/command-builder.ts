import { getAgent } from "@/agents/utils";
import { CommandSpec } from "@/agents/types";

export interface CommandBuilderParams {
  agentId?: string; // Optional for backward compatibility
  prompt: string;
  agentPath: string;
  executionId: string;
  authToken?: string;
  model?: string;
  permissionMode?: string;
  continueConversation?: boolean;
}

/**
 * Creates a command for any supported AI agent.
 * Supports both new object-based and old parameter-based calling styles.
 */
export function createAgentCommand(
  agentIdOrParams: string | CommandBuilderParams,
  params?: CommandBuilderParams
): CommandSpec {
  // Handle both calling styles
  let agentId: string;
  let commandParams: CommandBuilderParams;

  if (typeof agentIdOrParams === "string") {
    // Old style: createAgentCommand(agentId, params)
    agentId = agentIdOrParams;
    commandParams = params!;
  } else {
    // New style: createAgentCommand({ agentId, ...params })
    agentId = agentIdOrParams.agentId!;
    commandParams = agentIdOrParams;
  }

  return getAgent(agentId).buildCommand({
    prompt: commandParams.prompt,
    path: commandParams.agentPath,
    execId: commandParams.executionId,
    model: commandParams.model,
    continueConv: commandParams.continueConversation,
  });
}

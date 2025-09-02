import type { Agent, AgentId } from "./types";
import { AGENTS } from "./config";

export function getAgent(agentId: string): Agent {
  return AGENTS[agentId as AgentId] || AGENTS.claude;
}

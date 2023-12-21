/**
 * Agent configuration
 *
 * taken from https://github.com/dust-tt/dust/blob/main/types/src/front/assistant/agent.ts
 */

export type GlobalAgentStatus =
  | "active"
  | "disabled_by_admin"
  | "disabled_missing_datasource"
  | "disabled_free_workspace";
export type AgentStatus = "active" | "archived";
export type AgentConfigurationStatus = AgentStatus | GlobalAgentStatus;

export type AgentConfigurationScope = "global" | "workspace" | "published" | "private";

export interface AgentType {
  sId: string;
  name: string;
  description: string;
}

export interface AgentConfigurationType extends AgentType {
  version: number;

  scope: AgentConfigurationScope;
  status: AgentConfigurationStatus;

  description: string;
  pictureUrl: string;
}

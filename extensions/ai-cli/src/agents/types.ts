/**
 * Command specification for execution
 */
export interface CommandSpec {
  file: string;
  args: string[];
}

/**
 * Configuration for agent command execution
 */
export interface ExecutionConfig {
  timeout: number;
  maxInputLength: number;
  environment: Record<string, string>;
}

export interface ModelConfig {
  id: string;
  displayName: string;
}

export interface AgentConfig {
  id: string;
  name: string;
  models: Record<string, ModelConfig>;
  defaultModel: string;
  authEnvVar: string;
  pathPreferenceKey: string;
  tokenPreferenceKey: string;
  buildCommand: (params: {
    prompt: string;
    path: string;
    execId: string;
    model?: string;
    continueConv?: boolean;
  }) => CommandSpec;
  validatePath: (path: string) => {
    valid: boolean;
    error?: string;
    warning?: string;
  };
}

export type AgentId = "claude" | "openai" | "gemini" | "cursor";
export type Agent = AgentConfig;

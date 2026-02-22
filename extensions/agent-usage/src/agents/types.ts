export type AgentId = "amp" | "codex" | "droid" | "gemini" | "kimi" | "antigravity" | "zai";

export interface AgentDefinition {
  id: AgentId;
  name: string;
  icon: string;
  description: string;
  isSupported: boolean;
  settingsUrl?: string;
}

export interface UsageState<TUsage, TError> {
  isLoading: boolean;
  usage: TUsage | null;
  error: TError | null;
  revalidate: () => Promise<void>;
}

export interface Accessory {
  text: string;
  tooltip?: string;
}

import type { Image } from "@raycast/api";

export type AgentId =
  | "amp"
  | "claude"
  | "clinepass"
  | "codex"
  | "copilot"
  | "cursor"
  | "deepseek"
  | "droid"
  | "gemini"
  | "grok"
  | "kimi"
  | "synthetic"
  | "antigravity"
  | "zai"
  | "minimax"
  | "opencode-go";

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
  lastFetchedAt?: number;
}

export interface Accessory {
  text: string;
  tooltip?: string;
  icon?: Image.ImageLike;
}

export interface AgentVisibilityPreferences {
  showAmp: boolean;
  showAntigravity: boolean;
  showClaude: boolean;
  showClinePass: boolean;
  showCodex: boolean;
  showCopilot: boolean;
  showCursor: boolean;
  showDeepSeek: boolean;
  showDroid: boolean;
  showGemini: boolean;
  showGrok: boolean;
  showKimi: boolean;
  showMinimax: boolean;
  showOpencodeGo: boolean;
  showSynthetic: boolean;
  showZai: boolean;
}

/** Extended accessory with OpenCode active indicator */
export interface AccountAccessory extends Accessory {
  /** True if this account's token matches the one configured in OpenCode */
  isOpenCodeActive?: boolean;
}

export interface UsageWindow {
  id: string;
  label: string;
  usedPercent: number;
  resetAt?: string;
  windowMinutes?: number;
}

export interface ProviderSnapshot {
  id: string;
  name: string;
  plan?: string;
  windows: UsageWindow[];
  updatedAt: string;
  source: string;
  dashboardUrl?: string;
}

export interface ProviderOptions {
  codexHome?: string;
  claudeConfigDir?: string;
  claudeBridgeDirectory?: string;
}

export interface ProviderState {
  id: string;
  name: string;
  status: "ready" | "error" | "setup" | "waiting";
  needsConnection?: boolean;
  bridgeConnected?: boolean;
  snapshot?: ProviderSnapshot;
  error?: string;
}

export interface Settings extends ProviderOptions {
  enableCodex: boolean;
  enableClaude: boolean;
  customProviderFile?: string;
}

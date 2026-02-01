export interface GeminiModelQuota {
  percentLeft: number;
  resetsIn: string;
  modelId: string;
}

export interface GeminiUsage {
  email: string;
  tier: "Paid" | "Workspace" | "Free" | "Legacy" | "Unknown";
  proModel: GeminiModelQuota | null;
  flashModel: GeminiModelQuota | null;
}

export interface GeminiError {
  type: "not_configured" | "unsupported_auth" | "unauthorized" | "network_error" | "parse_error" | "unknown";
  message: string;
}

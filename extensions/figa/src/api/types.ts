export interface FigaApiSuccess<T> {
  success: true;
  message?: string;
  data: T;
}

export interface FigaApiFailure {
  success: false;
  message?: string;
  error?: {
    code?: string;
    details?: unknown;
  };
}

export type FigaApiResponse<T> = FigaApiSuccess<T> | FigaApiFailure;

export type FigaPlanTier = "free" | "pro" | "enterprise";

export type FigaFriendlyErrorKind =
  | "missing-api-key"
  | "invalid-api-key"
  | "paid-plan-required"
  | "insufficient-permissions"
  | "forbidden"
  | "rate-limited"
  | "validation-error"
  | "network-failure"
  | "invalid-base-url"
  | "unexpected-response"
  | "request-failed"
  | "unexpected-error";

export interface FigaWorkspaceContext {
  schemaVersion: 1;
  generatedAt: number;
  workspace: {
    id: string;
    name: string;
    baseCurrency: string;
  };
  plan: {
    tier: FigaPlanTier;
    criticalLimits: {
      apiKeysPerWorkspace: number | null;
      maxExpensesPerMonth: number | null;
      maxAiChatRequests: number | null;
      maxAiVisionRequests: number | null;
    };
  };
}

export interface FigaFriendlyError {
  kind: FigaFriendlyErrorKind;
  title: string;
  message: string;
  action?: string;
  status?: number | null;
  code?: string | null;
}

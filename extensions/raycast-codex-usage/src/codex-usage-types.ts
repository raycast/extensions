export type RateLimitWindow = {
  usedPercent: number;
  windowDurationMins: number | null;
  resetsAt: number | null;
};

export type RateLimitSnapshot = {
  limitId: string | null;
  limitName: string | null;
  primary: RateLimitWindow | null;
  secondary: RateLimitWindow | null;
  credits: unknown;
  planType: string | null;
  rateLimitReachedType: string | null;
};

export type GetAccountRateLimitsResponse = {
  rateLimits: RateLimitSnapshot;
  rateLimitsByLimitId: Record<string, RateLimitSnapshot | undefined> | null;
};

export type AuthStatusResponse = {
  authToken: string | null;
};

export type RateLimitResetCredit = {
  id: string;
  status: string;
  granted_at: string;
  expires_at: string;
  title?: string | null;
  description?: string | null;
};

export type RateLimitResetCreditsResponse = {
  credits: RateLimitResetCredit[];
  available_count: number;
};

export type ResetCreditsState = {
  data: RateLimitResetCreditsResponse | null;
  isLoading: boolean;
};

export type Skill = {
  name: string;
  description: string;
  interface?: {
    displayName: string;
    shortDescription: string;
  };
  scope: "user" | "system";
  enabled: boolean;
};

export type SkillsListEntry = {
  cwd: string;
  skills: Skill[];
  errors: unknown[];
};

export type SkillsListResponse = {
  data: SkillsListEntry[];
};

export type Thread = {
  id: string;
  preview: string;
  createdAt: number;
  updatedAt: number;
  cwd: string;
  source: string;
  name: string | null;
};

export type ThreadListResponse = {
  data: Thread[];
  nextCursor: string | null;
  backwardsCursor: string | null;
};

export type RpcResponse = {
  id?: number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
  };
};

export type DisplayWindow = {
  id: string;
  label: string;
  window: RateLimitWindow;
};

export type CodexUsageData = {
  rateLimits: GetAccountRateLimitsResponse;
  threads: Thread[];
  skills: Skill[];
};

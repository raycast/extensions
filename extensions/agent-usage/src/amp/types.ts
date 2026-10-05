export interface AmpFreeUsage {
  /** Percentage of Amp Free remaining (0–100). */
  percentRemaining: number;
  /** e.g. "resets daily" when present in CLI output */
  resetNote?: string;
}

export interface AmpSubscriptionUsage {
  /** e.g. "Megawatt" or "Gigawatt" */
  plan: string;
  otherPercentRemaining: number;
  orbPercentRemaining: number;
  /** e.g. "resets upon renewal in 24 days" */
  resetNote?: string;
}

export interface AmpUsage {
  email: string;
  nickname: string;
  ampFree?: AmpFreeUsage;
  subscription?: AmpSubscriptionUsage;
  individualCredits: {
    remaining: number;
    unit: string;
  };
}

export interface AmpError {
  type: "not_found" | "not_logged_in" | "unknown";
  message: string;
}

export interface AmpUsage {
  email: string;
  nickname: string;
  ampFree: {
    /** Percentage of Amp Free remaining (0–100). */
    percentRemaining: number;
    /** e.g. "resets daily" when present in CLI output */
    resetNote?: string;
  };
  individualCredits: {
    remaining: number;
    unit: string;
  };
}

export interface AmpError {
  type: "not_found" | "not_logged_in" | "unknown";
  message: string;
}

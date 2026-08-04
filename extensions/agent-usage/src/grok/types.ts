export interface GrokUsage {
  /** Credit usage percent consumed (0–100). */
  usedPercent: number;
  /** Remaining credit percent (0–100). */
  percentageRemaining: number;
  /** ISO timestamp when the current billing window resets, if known. */
  resetsAt: string | null;
  /** Dynamic window label: "Weekly", "Monthly", or "Credits". */
  windowLabel: string;
  accountEmail: string | null;
  accountName: string | null;
  teamId: string | null;
  /** e.g. "SuperGrok" for OIDC, otherwise raw auth_mode. */
  loginMethod: string | null;
  /** Where credentials came from, e.g. "auth.json". */
  source: string;
}

export interface GrokError {
  type: "not_configured" | "unauthorized" | "network_error" | "parse_error" | "unknown";
  message: string;
}

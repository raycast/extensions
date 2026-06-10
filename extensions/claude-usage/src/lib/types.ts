export interface UsageWindow {
  /** 0–100 percent used */
  utilization: number;
  /** ISO 8601 timestamp of next reset */
  resetsAt: string | null;
}

export interface ExtraUsage {
  isEnabled: boolean;
  monthlyLimit: number | null;
  usedCredits: number | null;
  utilization: number | null;
}

export interface ClaudeUsage {
  fiveHour: UsageWindow | null;
  sevenDay: UsageWindow | null;
  sevenDayOpus: UsageWindow | null;
  sevenDaySonnet: UsageWindow | null;
  extraUsage: ExtraUsage | null;
  /** When this snapshot was fetched (epoch ms) */
  fetchedAt: number;
  orgName: string;
}

export interface Sample {
  t: number; // epoch ms
  fiveHour: number | null;
  sevenDay: number | null;
}

export interface BurnRate {
  /** percentage points per hour, null if not enough data */
  sessionPerHour: number | null;
  weeklyPerHour: number | null;
  /** projected session utilization at reset time (capped at 100) */
  projectedSessionAtReset: number | null;
  /** epoch ms when session hits 100% at current pace, null if pace ≈ 0 */
  sessionExhaustedAt: number | null;
  /** minutes of data the rate is based on */
  windowMinutes: number;
}

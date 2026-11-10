export interface LimitWindow {
  id: string;
  title: string;
  /** 0–100, how much of the window has been consumed. */
  usedPercent: number;
  resetsAt?: Date;
  windowMinutes?: number;
}

/** Pay-as-you-go spend beyond the plan, in major currency units. */
export interface ExtraUsage {
  used: number;
  limit: number;
  currency: string;
}

export interface ProfileUsage {
  /** Profile id (a UUID) as stored by Claude Usage. */
  profile: string;
  name: string;
  plan?: string;
  /** The profile currently selected in the menu bar app. */
  active: boolean;
  windows: LimitWindow[];
  extra?: ExtraUsage;
  updatedAt?: Date;
  /** How often the app refreshes this profile, in seconds. */
  refreshInterval?: number;
}

export interface HistoryEntry {
  id: string;
  kind: "session" | "weekly";
  /** When the window reset. */
  at: Date;
  /** 0–100, how much of the window had been used when it reset. */
  usedPercent: number;
  /** Per-model weekly shares recorded with a weekly reset. */
  models: { title: string; usedPercent: number }[];
}

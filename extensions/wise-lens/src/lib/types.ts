export interface WiseProfile {
  id: number;
  type: "PERSONAL" | "BUSINESS" | string;
}

export interface WiseBalance {
  id: number;
  currency: string;
  amount: { value: number; currency: string };
  type: string;
  name?: string;
}

export interface WiseActivity {
  type: string;
  status: string;
  description: string;
  title: string;
  primaryAmount: string;
  secondaryAmount?: string;
  createdOn: string;
  resource?: { type: string; id: number };
}

export interface WiseRate {
  rate: number;
  source: string;
  target: string;
  time: string;
}

export type Direction = "in" | "out" | "neutral";

export interface ParsedAmount {
  value: number;
  currency: string;
}

export interface ActivitySummary {
  spent30: number;
  spentMonth: number;
  recent: WiseActivity[];
}

export interface BalanceWithDisplay extends WiseBalance {
  displayEquiv?: number;
}

export interface DashboardSnapshot {
  profileId: number;
  balances: BalanceWithDisplay[];
  total?: { value: number; currency: string; partial: boolean };
  summary: ActivitySummary;
  activities: WiseActivity[];
  fxRate?: { source: string; target: string; rate: number };
  usedRates?: { source: string; target: string; rate: number }[];
  fetchedAt: number;
  stale?: boolean;
  activitiesError?: string;
}

export interface Prefs {
  apiToken: string;
  displayCurrency: string;
  fxTargetCurrency: string;
  numberFormat: string;
  hideZeroBalances: boolean;
  hideMenuBarBalance: boolean;
  useSampleData: boolean;
}

export type UsageWindow = {
  utilization: number;
  resetsAt: string | null;
};

export type Usage = {
  fiveHour: UsageWindow | null;
  sevenDay: UsageWindow | null;
  fetchedAt: number;
};

export type UsageState = {
  connected: boolean;
  usage: Usage | null;
};

export const EMPTY_STATE: UsageState = { connected: false, usage: null };

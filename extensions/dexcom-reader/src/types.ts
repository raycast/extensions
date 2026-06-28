export enum LoadingState {
  Loading = "loading",
  Error = "error",
  Success = "success",
  Idle = "idle",
}

export interface GlucoseData {
  WT: string;
  ST: string;
  DT: string;
  Value: number;
  Trend: string;
}

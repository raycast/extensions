import { Color } from "@raycast/api";

// types/warmup.ts
export interface WarmupSet {
  setNumber: number;
  weight: number;
  reps: number;
  percentage: number;
  isWorkingSet?: boolean;
}

export interface WarmupCommandArgs {
  weight: string;
}

export interface WarmupScheme {
  percentage: number;
  reps: number;
  color: Color;
}

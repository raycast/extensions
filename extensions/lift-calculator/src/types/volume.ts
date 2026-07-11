// types/volume.ts
import { Color, Icon } from "@raycast/api";

export type TrainingGoal = "strength" | "power" | "hypertrophy" | "endurance";

export interface VolumeScheme {
  goal: TrainingGoal;
  sets: number;
  reps: number;
  percentage: number;
  color: Color;
  icon: Icon;
  restMinutes: number;
}

export interface VolumeResult {
  goal: TrainingGoal;
  scheme: VolumeScheme;
  weight: number;
  description: string;
  totalReps: number;
  totalVolume: number;
}

export interface VolumeCommandArgs {
  oneRepMax: string;
}

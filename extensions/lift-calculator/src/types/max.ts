// types/max.ts
import { Color, Icon } from "@raycast/api";

export interface MaxResult {
  label: string;
  value: number;
  tintColor: Color;
  icon: Icon;
  percentage?: number;
  text?: string;
  scheme?: "low" | "moderate" | "high";
}

export interface MaxCommandArgs {
  weight: string;
  reps: string;
}

export interface MaxScheme {
  reps: number;
  percentage: number;
  tintColor: Color;
  scheme: "low" | "moderate" | "high";
}

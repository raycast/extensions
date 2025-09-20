// types/shared.ts
export interface Preferences {
  unitSystem: "kg" | "lbs";
}

export interface ValidationRules {
  MIN_WEIGHT: number;
  MAX_WEIGHT: number;
  MIN_REPS: number;
  MAX_REPS: number;
}

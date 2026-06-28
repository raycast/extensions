import { Icon, Color } from "@raycast/api";
import { MaxResult } from "../types/max";
import { MAX_SCHEMES, SCHEME_DESCRIPTIONS } from "../constants/max";
import { VALIDATION, EPLEY } from "../constants/shared";

export const calculateOneRepMax = (weight: number, reps: number): number => {
  if (weight <= 0 || weight > VALIDATION.WEIGHT.MAX) {
    throw new Error(VALIDATION.getWeightError());
  }
  if (reps < VALIDATION.REPS.MIN || reps > VALIDATION.REPS.MAX) {
    throw new Error(VALIDATION.getRepsError());
  }

  // Standard Epley Formula
  return weight * (EPLEY.MULTIPLIER + EPLEY.COEFFICIENT * reps);
};

export const generateResults = (repMax: number): MaxResult[] => {
  return MAX_SCHEMES.map(({ reps, percentage, tintColor, scheme }) => ({
    label: `${reps} Repetition${reps > 1 ? "s" : ""}`,
    value: repMax * percentage,
    tintColor,
    icon: Icon.Weights,
    percentage,
    text: SCHEME_DESCRIPTIONS[scheme],
    scheme,
  }));
};

export const getErrorResult = (message?: string): MaxResult[] => [
  {
    label: "Invalid input format",
    value: 0,
    tintColor: Color.Red,
    icon: Icon.ExclamationMark,
    text: message || "Please enter weight and repetitions in the format: weight x reps (e.g. 70x6)",
  },
];

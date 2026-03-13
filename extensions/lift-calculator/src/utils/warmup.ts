import { getPreferenceValues } from "@raycast/api";
import { WarmupSet } from "../types/warmup";
import { WARMUP_SCHEMES } from "../constants/warmup";
import { VALIDATION, UNITS } from "../constants/shared";
import { Preferences } from "../types/shared";

export const calculateWarmupSets = (workingWeight: number): WarmupSet[] => {
  if (workingWeight <= 0 || workingWeight > VALIDATION.WEIGHT.MAX) {
    throw new Error(VALIDATION.getWeightError());
  }

  // Get the user's preferred unit system
  const { unitSystem } = getPreferenceValues<Preferences>();

  // Use the correct increment based on the unit system
  const increment = unitSystem === "lbs" ? UNITS.INCREMENTS.LBS : UNITS.INCREMENTS.KG;

  return WARMUP_SCHEMES.map((scheme, index) => {
    // Round to nearest plate increment
    const rawWeight = workingWeight * scheme.percentage;
    const weight = Math.round(rawWeight / increment) * increment;

    return {
      setNumber: index + 1,
      weight,
      reps: scheme.reps,
      percentage: scheme.percentage,
      isWorkingSet: scheme.percentage === 1.0,
    };
  });
};

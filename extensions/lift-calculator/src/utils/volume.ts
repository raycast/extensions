import { VolumeResult } from "../types/volume";
import { VOLUME_SCHEMES, TRAINING_DESCRIPTIONS } from "../constants/volume";
import { VALIDATION } from "../constants/shared";

export const calculateVolume = (oneRepMax: number): VolumeResult[] => {
  if (oneRepMax <= 0 || oneRepMax > VALIDATION.WEIGHT.MAX) {
    throw new Error(VALIDATION.getWeightError());
  }

  return VOLUME_SCHEMES.map((scheme) => {
    const weight = Math.round((oneRepMax * scheme.percentage) / 5) * 5; // Round to nearest 5
    const totalReps = scheme.sets * scheme.reps;
    const totalVolume = weight * totalReps;

    return {
      goal: scheme.goal,
      scheme,
      weight,
      totalReps,
      totalVolume,
      description: TRAINING_DESCRIPTIONS[scheme.goal],
    };
  });
};

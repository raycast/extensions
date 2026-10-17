export function formatWeight(weightKg: number | null): string {
  if (weightKg === null) {
    return "-";
  }
  return `${weightKg} kg`;
}

export function formatReps(reps: number | null): string {
  if (reps === null) {
    return "-";
  }
  return `${reps}`;
}

export function formatDistance(meters: number | null): string {
  if (meters === null) {
    return "-";
  }
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${meters} m`;
}

export function formatRPE(rpe: number | null): string {
  if (rpe === null) {
    return "-";
  }
  return `${rpe}`;
}

export function calculateTotalVolume(
  exercises: Array<{
    sets: Array<{
      weight_kg: number | null;
      reps: number | null;
    }>;
  }>,
): number {
  let totalVolume = 0;
  exercises.forEach((exercise) => {
    exercise.sets.forEach((set) => {
      if (set.weight_kg !== null && set.reps !== null) {
        totalVolume += set.weight_kg * set.reps;
      }
    });
  });
  return totalVolume;
}

export function formatVolume(volumeKg: number): string {
  if (volumeKg === 0) {
    return "0 kg";
  }
  if (volumeKg >= 1000) {
    return `${(volumeKg / 1000).toFixed(1)} t`;
  }
  return `${Math.round(volumeKg)} kg`;
}

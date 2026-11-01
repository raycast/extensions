const DEFAULT_GENERATION_TIMEOUT_SECONDS = 10;
const DEFAULT_COMPATIBLE_SCALE = 4;

interface GenerationTimeoutPreferenceLike {
  generationTimeout?: string | number;
}

interface CompatibleScalePreferenceLike {
  scale?: string | number;
}

function parsePositiveNumber(value: string | number | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
}

export function resolveGenerationTimeoutMs(
  preferences: GenerationTimeoutPreferenceLike,
  fallbackSeconds = DEFAULT_GENERATION_TIMEOUT_SECONDS,
): number {
  return (parsePositiveNumber(preferences.generationTimeout) ?? fallbackSeconds) * 1000;
}

export function resolveCompatibleScale(
  preferences: CompatibleScalePreferenceLike,
  fallbackScale = DEFAULT_COMPATIBLE_SCALE,
): number {
  return parsePositiveNumber(preferences.scale) ?? fallbackScale;
}

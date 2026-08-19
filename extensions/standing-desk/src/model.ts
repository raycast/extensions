export const DEFAULT_SIT_HEIGHT = 70;
export const DEFAULT_STAND_HEIGHT = 110;

export type DeskConfiguration = {
  deskName: string;
  baseHeight: number;
  minimumHeight: number;
  maximumHeight: number;
  stepHeight: number;
};

export const DEFAULT_CONFIGURATION: Readonly<DeskConfiguration> = {
  deskName: "Desk",
  baseHeight: 62,
  minimumHeight: 62,
  maximumHeight: 127,
  stepHeight: 1,
};

export function defaultConfiguration(): DeskConfiguration {
  return { ...DEFAULT_CONFIGURATION };
}

export function parseHeight(value: string, label: string): number {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${label} must be a number.`);
  }
  const parsed = Number(normalized.replace(",", "."));
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a number.`);
  }
  return parsed;
}

export function validateConfiguration(
  configuration: DeskConfiguration,
): DeskConfiguration {
  if (
    typeof configuration.deskName !== "string" ||
    !configuration.deskName.trim()
  ) {
    throw new Error("Desk Bluetooth Name cannot be empty.");
  }
  const numericSettings: Array<[string, number]> = [
    ["Base Height", configuration.baseHeight],
    ["Minimum Height", configuration.minimumHeight],
    ["Maximum Height", configuration.maximumHeight],
    ["Raise and Lower Step", configuration.stepHeight],
  ];
  for (const [label, value] of numericSettings) {
    if (!Number.isFinite(value)) {
      throw new Error(`${label} must be a number.`);
    }
  }
  if (
    configuration.baseHeight <= 0 ||
    configuration.minimumHeight <= 0 ||
    configuration.maximumHeight <= 0
  ) {
    throw new Error("Base, Minimum, and Maximum Height must be above 0 cm.");
  }
  if (configuration.minimumHeight >= configuration.maximumHeight) {
    throw new Error("Minimum Height must be lower than Maximum Height.");
  }
  if (configuration.baseHeight > configuration.minimumHeight) {
    throw new Error("Base Height cannot exceed Minimum Height.");
  }
  if (configuration.stepHeight <= 0 || configuration.stepHeight > 20) {
    throw new Error("Raise and Lower Step must be between 0 and 20 cm.");
  }
  return configuration;
}

export function validateTarget(
  height: number,
  configuration: DeskConfiguration,
): number {
  if (!Number.isFinite(height)) {
    throw new Error("Target height must be a number.");
  }
  if (
    height < configuration.minimumHeight ||
    height > configuration.maximumHeight
  ) {
    throw new Error(
      `Target height must be between ${formatHeight(configuration.minimumHeight)} and ${formatHeight(configuration.maximumHeight)}.`,
    );
  }
  return Math.round(height * 10) / 10;
}

export function formatHeight(height: number): string {
  return `${height.toFixed(1)} cm`;
}

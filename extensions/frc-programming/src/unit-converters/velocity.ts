import { toMeters, toGearRatio, ParameterDisplay, ConverterConfig, createConverter } from "./general";

const VELOCITY_UNITS: string[] = ["rpm", "m/s", "mps", "ft/s", "fps", "km/h", "kph", "mph"];
const VELOCITY_DEFAULTS = {
  wheelRadius: 0.0508,
  gearRatio: 1,
};

const UNIT_ALIASES: Record<string, string> = {
  rpm: "rpm",
  "m/s": "m/s",
  mps: "m/s",
  "ft/s": "ft/s",
  fps: "ft/s",
  "km/h": "km/h",
  kph: "km/h",
  mph: "mph",
};

const TO_INTERMEDIATE_FACTORS: Record<string, (value: number, params: ParsedParams) => number> = {
  rpm: (value, params) => (value / params.gearRatio) * ((2 * Math.PI * params.wheelRadius) / 60),
  "m/s": (value) => value,
  "ft/s": (value) => value * 0.3048,
  "km/h": (value) => value / 3.6,
  mph: (value) => value * 0.44704,
};

const FROM_INTERMEDIATE_FACTORS: Record<string, (value: number, params: ParsedParams) => number> = {
  rpm: (value, params) => {
    const denominator = 2 * Math.PI * params.wheelRadius;
    return denominator !== 0 ? (60 * value * params.gearRatio) / denominator : 0;
  },
  "m/s": (value) => value,
  "ft/s": (value) => value * 3.28084,
  "km/h": (value) => value * 3.6,
  mph: (value) => value * 2.23694,
};

interface ParsedParams {
  wheelRadius: number;
  gearRatio: number;
  hasWheelRadius: boolean;
  hasGearRatio: boolean;
  wheelRadiusInput: string;
  parametersNeeded?: string[];
}

function parseVelocityParameters(parameterStrings: string[]): ParsedParams {
  const result: ParsedParams = {
    wheelRadius: VELOCITY_DEFAULTS.wheelRadius,
    gearRatio: VELOCITY_DEFAULTS.gearRatio,
    hasWheelRadius: false,
    hasGearRatio: false,
    wheelRadiusInput: "",
    parametersNeeded: [],
  };

  parameterStrings.forEach((param) => {
    const fusedMatch = param.match(/^(\d+\.?\d*)([a-z]+)$/i);
    if (fusedMatch) {
      const [, value, unit] = fusedMatch;
      const parsedValue = parseFloat(value);
      if (parsedValue > 0) {
        result.wheelRadius = toMeters(parsedValue, unit);
        result.wheelRadiusInput = `${value}${unit}`;
        result.hasWheelRadius = true;
      }
      return;
    }

    const spacedMatch = param.match(/^(\d+\.?\d*)\s+([a-z]+)$/i);
    if (spacedMatch) {
      const [, value, unit] = spacedMatch;
      const parsedValue = parseFloat(value);
      if (parsedValue > 0) {
        result.wheelRadius = toMeters(parsedValue, unit);
        result.wheelRadiusInput = `${value} ${unit}`;
        result.hasWheelRadius = true;
      }
      return;
    }

    if (param.includes(":")) {
      const ratio = toGearRatio(param);
      if (ratio > 0) {
        result.gearRatio = ratio;
        result.hasGearRatio = true;
      }
    }
  });

  if (!result.hasWheelRadius) {
    result.parametersNeeded!.push("wheel radius");
  }
  if (!result.hasGearRatio) {
    result.parametersNeeded!.push("gear ratio");
  }

  return result;
}

function formatGearRatio(ratio: number, isDefault: boolean): string {
  if (isDefault) {
    return "1:1";
  }
  if (ratio === Math.round(ratio)) {
    return `${Math.round(ratio)}:1`;
  }
  return `${ratio.toFixed(2)}:1`;
}

function buildParametersUsed(parsed: ParsedParams): ParameterDisplay[] {
  return [
    {
      name: "Wheel radius",
      value: parsed.hasWheelRadius
        ? parsed.wheelRadiusInput
        : `${(VELOCITY_DEFAULTS.wheelRadius * 39.37).toFixed(1)}in`,
      isDefault: !parsed.hasWheelRadius,
    },
    {
      name: "Gear ratio",
      value: formatGearRatio(parsed.gearRatio, !parsed.hasGearRatio),
      isDefault: !parsed.hasGearRatio,
    },
  ];
}

const velocityConfig: ConverterConfig<ParsedParams> = {
  name: "Velocity",
  units: VELOCITY_UNITS,
  intermediateUnit: "m/s",
  unitAliases: UNIT_ALIASES,
  toIntermediate: TO_INTERMEDIATE_FACTORS,
  fromIntermediate: FROM_INTERMEDIATE_FACTORS,
  parseParameters: parseVelocityParameters,
  buildParametersUsed: buildParametersUsed,
};

export const convertVelocity = createConverter(velocityConfig);

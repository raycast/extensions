import { ParameterDisplay, ConverterConfig, createConverter } from "./general";

const ANGULAR_VELOCITY_UNITS: string[] = ["rpm", "rps", "rad/s", "deg/s"];

const UNIT_ALIASES: Record<string, string> = {
  rpm: "rpm",
  rps: "rps",
  "r/s": "rps",
  hz: "rps",
  "rev/s": "rps",
  "rad/s": "rad/s",
  "radian/s": "rad/s",
  "radians/s": "rad/s",
  "deg/s": "deg/s",
  "°/s": "deg/s",
};

const TO_INTERMEDIATE_FACTORS: Record<string, (value: number, params: ParsedParams) => number> = {
  rpm: (value) => (value * (2 * Math.PI)) / 60,
  rps: (value) => value * (2 * Math.PI),
  "rad/s": (value) => value,
  "deg/s": (value) => value * (Math.PI / 180),
};

const FROM_INTERMEDIATE_FACTORS: Record<string, (value: number, params: ParsedParams) => number> = {
  rpm: (value) => (value * 60) / (2 * Math.PI),
  rps: (value) => value / (2 * Math.PI),
  "rad/s": (value) => value,
  "deg/s": (value) => (value * 180) / Math.PI,
};

interface ParsedParams {
  parametersNeeded?: string[];
}

function parseAngularVelocityParameters(): ParsedParams {
  const result: ParsedParams = {
    parametersNeeded: [],
  };

  return result;
}

function buildParametersUsed(): ParameterDisplay[] {
  return [];
}

const angularVelocityConfig: ConverterConfig<ParsedParams> = {
  name: "Angular Velocity",
  units: ANGULAR_VELOCITY_UNITS,
  intermediateUnit: "rad/s",
  unitAliases: UNIT_ALIASES,
  toIntermediate: TO_INTERMEDIATE_FACTORS,
  fromIntermediate: FROM_INTERMEDIATE_FACTORS,
  parseParameters: parseAngularVelocityParameters,
  buildParametersUsed: buildParametersUsed,
};

export const convertAngularVelocity = createConverter(angularVelocityConfig);

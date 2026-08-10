import {
  applyWheelRadiusParameter,
  createWheelRadiusState,
  ParameterDisplay,
  ConverterConfig,
  createConverter,
} from "./general";

const TORQUE_UNITS: string[] = [
  "nm",
  "n·m",
  "inlb",
  "in-lb",
  "lbft",
  "lbf·ft",
  "ozin",
  "oz-in",
  "n",
  "newton",
  "newtons",
  "lbf",
  "pound-force",
];
const TORQUE_DEFAULTS = {
  wheelRadius: 0.0508,
};

const UNIT_ALIASES = {
  nm: "N·m",
  "n·m": "N·m",
  inlb: "in·lb",
  "in-lb": "in·lb",
  lbft: "lb·ft",
  "lbf·ft": "lb·ft",
  ozin: "oz·in",
  "oz-in": "oz·in",
  n: "N",
  newton: "N",
  newtons: "N",
  lbf: "lbf",
  "pound-force": "lbf",
};

const TO_INTERMEDIATE_FACTORS: Record<string, (value: number, params: ParsedParams) => number> = {
  "N·m": (value) => value,
  "in·lb": (value) => value / 8.850745767,
  "lb·ft": (value) => value / 0.737562149,
  "oz·in": (value) => value / 141.611932,
  N: (value, params) => value * params.wheelRadius,
  lbf: (value, params) => value * 4.448221615 * params.wheelRadius,
};

const FROM_INTERMEDIATE_FACTORS: Record<string, (value: number, params: ParsedParams) => number> = {
  "N·m": (value) => value,
  "in·lb": (value) => value * 8.850745767,
  "lb·ft": (value) => value * 0.737562149,
  "oz·in": (value) => value * 141.611932,
  N: (value, params) => value / params.wheelRadius,
  lbf: (value, params) => value / params.wheelRadius / 4.448221615,
};

interface ParsedParams {
  wheelRadius: number;
  hasWheelRadius: boolean;
  wheelRadiusInput: string;
  parametersNeeded?: string[];
}

function parseTorqueParameters(parameterStrings: string[]): ParsedParams {
  const wheelRadius = createWheelRadiusState(TORQUE_DEFAULTS.wheelRadius);

  parameterStrings.forEach((param) => {
    applyWheelRadiusParameter(wheelRadius, param);
  });

  return {
    ...wheelRadius,
    parametersNeeded: [],
  };
}

function buildParametersUsed(parsed: ParsedParams): ParameterDisplay[] {
  return [
    {
      name: "Wheel radius",
      value: parsed.hasWheelRadius ? parsed.wheelRadiusInput : `${(TORQUE_DEFAULTS.wheelRadius * 39.37).toFixed(1)}in`,
      isDefault: !parsed.hasWheelRadius,
    },
  ];
}

const torqueConfig: ConverterConfig<ParsedParams> = {
  name: "Torque",
  units: TORQUE_UNITS,
  intermediateUnit: "N·m",
  unitAliases: UNIT_ALIASES,
  toIntermediate: TO_INTERMEDIATE_FACTORS,
  fromIntermediate: FROM_INTERMEDIATE_FACTORS,
  parseParameters: parseTorqueParameters,
  buildParametersUsed: buildParametersUsed,
};

export const convertTorque = createConverter(torqueConfig);

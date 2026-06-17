export interface ConversionResult {
  result: number | null;
  resultUnit: string;
  parametersNeeded: string[];
  parametersUsed: ParameterDisplay[];
  warnings?: string[];
}

export interface ParameterDisplay {
  name: string;
  value: string;
  isDefault: boolean;
}

export interface ConverterConfig<TParams = unknown> {
  name: string;
  units: string[];
  intermediateUnit: string;
  unitAliases: Record<string, string>;
  toIntermediate: Record<string, (value: number, params: TParams) => number>;
  fromIntermediate: Record<string, (value: number, params: TParams) => number>;
  parseParameters: (params: string[]) => TParams;
  buildParametersUsed: (params: TParams) => ParameterDisplay[];
}

export function normalizeUnit(unitAliases: Record<string, string>, unit: string | null | undefined): string {
  if (!unit) return "";
  return unitAliases[unit.toLowerCase()] || unit.toLowerCase();
}

export function createConverter<TParams>(config: ConverterConfig<TParams>) {
  return (value: number, fromUnit: string, toUnit: string, parameters: string[]): ConversionResult => {
    const normalizedFromUnit = normalizeUnit(config.unitAliases, fromUnit);
    const normalizedToUnit = normalizeUnit(config.unitAliases, toUnit);
    const params = config.parseParameters(parameters);

    const parametersNeeded: string[] = [];

    if (
      params &&
      typeof params === "object" &&
      "parametersNeeded" in params &&
      Array.isArray((params as { parametersNeeded: unknown }).parametersNeeded)
    ) {
      parametersNeeded.push(...(params as { parametersNeeded: string[] }).parametersNeeded);
    }

    const toIntermediateFn = config.toIntermediate[normalizedFromUnit];
    if (!toIntermediateFn) {
      const combinedNeeded =
        parametersNeeded.length > 0 ? [...parametersNeeded, "unrecognized input unit"] : ["unrecognized input unit"];
      return {
        result: null,
        resultUnit: toUnit,
        parametersNeeded: combinedNeeded,
        parametersUsed: config.buildParametersUsed(params),
      };
    }

    const intermediateValue = toIntermediateFn(value, params);

    let result: number | null = value;
    let resultUnit = fromUnit;

    if (normalizedToUnit && normalizedToUnit.trim() !== "") {
      const fromIntermediateFn = config.fromIntermediate[normalizedToUnit];
      if (fromIntermediateFn) {
        result = fromIntermediateFn(intermediateValue, params);
        resultUnit = toUnit;
      } else {
        parametersNeeded.push("unrecognized output unit");
      }
    }

    return {
      result,
      resultUnit,
      parametersNeeded,
      parametersUsed: config.buildParametersUsed(params),
    };
  };
}

export function toMeters(value: number, unit: string | null | undefined) {
  if (!unit) return value;
  const factors: Record<string, number> = {
    mm: 0.001,
    millimeter: 0.001,
    millimeters: 0.001,
    cm: 0.01,
    centimeter: 0.01,
    centimeters: 0.01,
    dm: 0.1,
    decimeter: 0.1,
    decimeters: 0.1,
    m: 1,
    meter: 1,
    meters: 1,
    km: 1000,
    kilometer: 1000,
    kilometers: 1000,
    in: 0.0254,
    inch: 0.0254,
    inches: 0.0254,
    ft: 0.3048,
    foot: 0.3048,
    feet: 0.3048,
    yd: 0.9144,
    yard: 0.9144,
    yards: 0.9144,
  };

  return (factors[unit.toLowerCase()] ?? 1) * value;
}

export function toGearRatio(gearRatioStr: string | null | undefined): number {
  if (!gearRatioStr) return 1;
  const parts = gearRatioStr.split(":");
  if (parts.length !== 2) {
    const parsed = Number.parseFloat(gearRatioStr);
    return isNaN(parsed) ? 1 : parsed;
  }

  const numerator = parseFloat(parts[0]);
  const denominator = parseFloat(parts[1]);

  if (isNaN(numerator) || isNaN(denominator) || denominator === 0) return 1;

  return numerator / denominator;
}

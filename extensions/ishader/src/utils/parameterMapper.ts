import { ShaderConfig, ShaderParameter, ParametersRecord, ParameterValue } from "../config/types";

/**
 * Maps parameter name from config to processor parameter name
 * Used when parameter names differ between config and processor interface
 */
const PARAMETER_NAME_MAP: Record<string, Record<string, string>> = {};

/**
 * Clamps a numeric value to min/max bounds if defined
 */
function clampIfNeeded(value: number, param: ShaderParameter): number {
  let v = value;
  if (!isFinite(v)) {
    v = Number(param.default ?? 0);
  }
  if (param.min !== undefined) {
    v = Math.max(param.min, v);
  }
  if (param.max !== undefined) {
    v = Math.min(param.max, v);
  }
  return v;
}

/**
 * Converts a parameter value to the correct type based on parameter definition
 */
function convertParameterValue(
  param: ShaderParameter,
  value: ParameterValue,
  rawParameters: ParametersRecord & { _shaderId?: string },
): ParameterValue {
  // Check if parameter name needs mapping
  const shaderId = rawParameters._shaderId;
  const mappedName = shaderId ? PARAMETER_NAME_MAP[shaderId]?.[param.id] || param.id : param.id;

  // Get the raw value (might be under mapped name)
  const rawValue = rawParameters[param.id] ?? rawParameters[mappedName] ?? param.default;

  switch (param.type) {
    case "int": {
      const parsed = parseInt(String(rawValue), 10);
      const safe = isNaN(parsed) ? Number(param.default ?? 0) : parsed;
      return Math.trunc(clampIfNeeded(safe, param));
    }
    case "float": {
      const parsed = parseFloat(String(rawValue));
      const safe = isNaN(parsed) ? Number(param.default ?? 0) : parsed;
      return clampIfNeeded(safe, param);
    }
    case "bool":
      return Boolean(rawValue);
    case "string":
      return String(rawValue ?? "");
    case "enum": {
      // Check if all enum options are numeric strings - if so, convert to number
      const options = param.options || [];
      const allNumeric = options.length > 0 && options.every((opt) => !isNaN(Number(opt.value)));

      if (allNumeric) {
        // Convert to number for numeric enums
        const parsed = Number(rawValue);
        return isNaN(parsed) ? Number(param.default ?? 0) : parsed;
      }

      // Otherwise keep as string for consistency with Form.Dropdown
      return String(rawValue ?? "");
    }
    default:
      return rawValue;
  }
}

/**
 * Dynamically converts generic parameters to shader-specific parameter object
 * This is a universal mapper that works for all shaders
 */
export function mapParametersToShader<T>(shaderConfig: ShaderConfig, rawParameters: ParametersRecord): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: Record<string, any> = {};

  // Create extended parameters object with shader ID for mapping lookup
  const extendedParams = { ...rawParameters, _shaderId: shaderConfig.id };

  // Convert each parameter based on its configuration
  shaderConfig.parameters.forEach((param) => {
    const mappedName = PARAMETER_NAME_MAP[shaderConfig.id]?.[param.id] || param.id;
    const convertedValue = convertParameterValue(param, rawParameters[param.id], extendedParams);
    result[mappedName] = convertedValue;
  });

  return result as T;
}

/**
 * Universal parameter mapper function
 * Automatically maps parameters for any shader - no need for shader-specific functions
 */
export function createShaderParams<T>(shaderConfig: ShaderConfig, rawParameters: ParametersRecord): T {
  return mapParametersToShader<T>(shaderConfig, rawParameters);
}

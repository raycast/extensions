import { useState, useCallback, useEffect } from "react";
import { ShaderConfig } from "../config/shaders";
import { ParametersRecord, ParameterValue } from "../config/types";

export function useShaderParameters(shaderConfig: ShaderConfig) {
  // Create initial state for all parameters
  const createInitialParams = (config: ShaderConfig): ParametersRecord => {
    return config.parameters.reduce((acc, param) => {
      acc[param.id] = param.default;
      return acc;
    }, {} as ParametersRecord);
  };

  const [parameters, setParameters] = useState<ParametersRecord>(() => createInitialParams(shaderConfig));

  // Reset parameters when shader changes
  useEffect(() => {
    setParameters(createInitialParams(shaderConfig));
  }, [shaderConfig.id]);

  const setParameter = useCallback(
    (id: string, value: ParameterValue) => {
      const param = shaderConfig.parameters.find((p) => p.id === id);
      if (!param) {
        console.warn(`Parameter ${id} not found in shader config`);
        return;
      }

      // Validate value based on parameter type
      let validatedValue = value;
      if (param.type === "float" || param.type === "int") {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
          if (param.min !== undefined && numValue < param.min) {
            validatedValue = param.min;
          } else if (param.max !== undefined && numValue > param.max) {
            validatedValue = param.max;
          } else {
            validatedValue = param.type === "int" ? Math.floor(numValue) : numValue;
          }

          // Special handling for pixelSize in dither shader - only odd values (1, 3, 5, 7, ...)
          if (param.id === "pixelSize" && shaderConfig.id === "dither") {
            validatedValue = Math.max(1, Math.floor(validatedValue) | 1);
          }
        }
      }

      setParameters((prev) => ({
        ...prev,
        [id]: validatedValue,
      }));
    },
    [shaderConfig],
  );

  const getParameter = useCallback(
    (id: string) => {
      return parameters[id];
    },
    [parameters],
  );

  const resetParameters = useCallback(() => {
    setParameters(createInitialParams(shaderConfig));
  }, [shaderConfig]);

  const updateParameters = useCallback((updates: ParametersRecord) => {
    setParameters((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  return {
    parameters,
    setParameter,
    getParameter,
    resetParameters,
    updateParameters,
  };
}

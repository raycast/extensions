import { getShaderConfig } from "../config/shaders";
import { PROCESSOR_REGISTRY } from "./processors";
import { createShaderParams } from "./parameterMapper";
import { ParametersRecord } from "../config/types";

/**
 * Universal image processor that routes to appropriate shader processor
 * Fully dynamic - automatically works with any shader registered in PROCESSOR_REGISTRY
 */
export async function processImageWithShader(
  shaderId: string,
  inputImagePath: string,
  parameters: ParametersRecord,
  outputPath?: string,
): Promise<string> {
  // Get shader configuration
  const shaderConfig = getShaderConfig(shaderId);
  if (!shaderConfig) {
    throw new Error(`Shader configuration not found for ID: ${shaderId}`);
  }

  // Get processor from registry
  const processorEntry = PROCESSOR_REGISTRY[shaderId];
  if (!processorEntry) {
    throw new Error(`Processor not registered for shader ID: ${shaderId}`);
  }

  // Convert parameters to shader-specific format using universal mapper
  const shaderParams = createShaderParams(shaderConfig, { ...parameters });

  // Call the processor function
  return processorEntry.processor(inputImagePath, shaderParams, outputPath);
}

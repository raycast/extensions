// Main shaders configuration file
// Imports all individual shader configs and exports them as a registry

import { ShaderConfig, sortParameters } from "./types";
import { DITHER_CONFIG } from "./shaders/dither";
import { ASCII_CONFIG } from "./shaders/ascii";
import { BRICK_CONFIG } from "./shaders/brick";
import { EDIT_CONFIG } from "./shaders/edit";

// Sort parameters for each config
const processConfig = (config: ShaderConfig): ShaderConfig => ({
  ...config,
  parameters: sortParameters(config.parameters),
});

// Export all shader configurations with sorted parameters
export const SHADER_CONFIGS: ShaderConfig[] = [
  processConfig(EDIT_CONFIG),
  processConfig(DITHER_CONFIG),
  processConfig(ASCII_CONFIG),
  processConfig(BRICK_CONFIG),
];

// Re-export types and helper functions
export * from "./types";

// Helper function to get shader config by ID
export function getShaderConfig(id: string): ShaderConfig | undefined {
  return SHADER_CONFIGS.find((s) => s.id === id);
}

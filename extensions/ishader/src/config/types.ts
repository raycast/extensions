import { Keyboard } from "@raycast/api";

export type ParameterType = "float" | "int" | "bool" | "string" | "enum";

// Parameter value type (union of all possible parameter values)
export type ParameterValue = string | number | boolean;

// Parameters record type
export type ParametersRecord = Record<string, ParameterValue>;

// Internal shortcut type for configuration (more flexible)
export type ConfigShortcut = { modifiers: string[]; key: string };

// Helper function to convert config shortcut to Raycast Keyboard.Shortcut
export function convertShortcut(configShortcut?: ConfigShortcut): Keyboard.Shortcut | undefined {
  if (!configShortcut) return undefined;

  // Type assertion is safe here because we validate at runtime
  // The modifiers and keys should match Keyboard.KeyModifier and Keyboard.KeyEquivalent
  return {
    modifiers: configShortcut.modifiers as Keyboard.KeyModifier[],
    key: configShortcut.key as Keyboard.KeyEquivalent,
  };
}

export interface ShaderParameter {
  id: string; // Unique parameter ID
  label: string; // Display name
  type: ParameterType; // Parameter type
  default: string | number | boolean; // Default value
  min?: number; // Minimum value (for numeric types)
  max?: number; // Maximum value (for numeric types)
  step?: number; // Step size for increment/decrement
  options?: { value: string; label: string }[]; // For enum type
  shortcut?: ConfigShortcut; // Keyboard shortcut (internal config format)
  metadata?: boolean; // Show in metadata section
  category?: "effect" | "preprocessing" | "common"; // Parameter category
  incrementShortcut?: ConfigShortcut; // Separate shortcut for increment
  decrementShortcut?: ConfigShortcut; // Separate shortcut for decrement
  info?: string; // Help text
  order?: number; // Display order (lower = earlier). Effect params should come first, then common/preprocessing
}

export interface ShaderConfig {
  id: string; // Unique shader ID
  name: string; // Display name
  description?: string; // Shader description
  glslFile?: string; // Path to GLSL file (for future use)
  processor: string; // Processor function name
  parameters: ShaderParameter[]; // Parameters for this shader
}

// Helper function to sort parameters by order
export function sortParameters(parameters: ShaderParameter[]): ShaderParameter[] {
  return [...parameters].sort((a, b) => {
    const orderA = a.order ?? 999;
    const orderB = b.order ?? 999;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    // If same order, maintain original order
    return 0;
  });
}

// Helper function to get shader config by ID (from array)
export function getShaderConfigFromArray(configs: ShaderConfig[], id: string): ShaderConfig | undefined {
  return configs.find((s) => s.id === id);
}

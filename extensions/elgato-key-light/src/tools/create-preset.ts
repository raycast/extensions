import { Preset, savePreset } from "../presets";
import { randomUUID } from "crypto";
import { ToolResponse, formatErrorResponse } from "../utils";

// Default values for brightness and temperature
const DEFAULT_BRIGHTNESS = 50;
const DEFAULT_TEMPERATURE = 50;

/**
 * Tool to create a new preset for Key Lights
 */
export default async function tool(input: {
  name: string;
  icon?: string;
  brightness?: number;
  temperature?: number;
}): Promise<ToolResponse<Preset>> {
  try {
    const id = randomUUID();

    // Use default values if not provided
    const brightness = Math.max(0, Math.min(100, input.brightness ?? DEFAULT_BRIGHTNESS));
    const temperature = Math.max(0, Math.min(100, input.temperature ?? DEFAULT_TEMPERATURE));

    const preset: Preset = {
      id,
      name: input.name,
      icon: input.icon,
      settings: {
        brightness,
        temperature,
      },
    };

    await savePreset(preset);

    return {
      success: true,
      message: `Created preset "${preset.name}"`,
      data: preset,
    };
  } catch (error) {
    return {
      ...formatErrorResponse(error, "create preset"),
      data: {
        id: "",
        name: input.name,
        icon: input.icon,
        settings: {
          brightness: 0,
          temperature: 0,
        },
      },
    };
  }
}

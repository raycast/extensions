import { convertFormTemperatureToActual } from "../elgato";
import { getPresets } from "../presets";
import { discoverKeyLights, ToolResponse, formatErrorResponse } from "../utils";

/**
 * Tool to apply a preset to all connected Key Lights
 *
 * @example
 * // Apply the night preset by name
 * apply-preset({ presetName: "night" })
 *
 * @example
 * // Apply the warm preset by name
 * apply-preset({ presetName: "warm" })
 *
 * @example
 * // Apply by ID
 * apply-preset({ presetId: "default" })
 *
 * @param input.presetName - The name of the preset (case-insensitive), e.g., "night", "day", "warm", "cold", "default"
 * @param input.presetId - The ID of the preset, e.g., "night", "day", "warm", "cold", "default"
 *
 * When a user asks to apply a preset like "switch to night mode" or "apply the warm preset",
 * extract the preset name and pass it to this tool.
 */
export default async function tool(input: {
  presetId?: string;
  presetName?: string;
}): Promise<ToolResponse<{ presetName: string }>> {
  try {
    // If neither presetId nor presetName is provided, list available presets
    if (!input.presetId && !input.presetName) {
      const presets = await getPresets();
      const presetList = presets.map((p) => `- ${p.name} (${p.id})`).join("\n");

      return {
        success: false,
        message: "No preset specified",
        error: `Please specify a preset name or ID. Available presets:\n${presetList}`,
        data: { presetName: "" },
      };
    }

    const presets = await getPresets();

    // Find by ID or name (case-insensitive)
    const preset = presets.find(
      (p) =>
        (input.presetId && p.id === input.presetId) ||
        (input.presetName && p.name.toLowerCase() === input.presetName.toLowerCase()),
    );

    if (!preset) {
      const presetList = presets.map((p) => `- ${p.name} (${p.id})`).join("\n");
      return {
        success: false,
        message: "Preset not found",
        error: `Preset "${input.presetId || input.presetName}" not found. Available presets:\n${presetList}`,
        data: { presetName: "" },
      };
    }

    const keyLight = await discoverKeyLights();

    // First turn on lights to ensure they're responsive
    await keyLight.turnOn();

    // Now apply the preset settings
    await keyLight.update({
      brightness: preset.settings.brightness,
      temperature: preset.settings.temperature
        ? convertFormTemperatureToActual(preset.settings.temperature)
        : undefined,
    });

    return {
      success: true,
      message: `Applied preset "${preset.name}"`,
      data: { presetName: preset.name },
    };
  } catch (error) {
    return {
      ...formatErrorResponse(error, `apply preset`),
      data: { presetName: "" },
    };
  }
}

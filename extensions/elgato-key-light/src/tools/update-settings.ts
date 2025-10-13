import { convertFormTemperatureToActual } from "../elgato";
import { discoverKeyLights, ToolResponse, formatErrorResponse } from "../utils";

/**
 * Input parameters for updating Key Light settings
 */
interface SettingsInput {
  /**
   * Brightness percentage (0-100)
   */
  brightness?: number;

  /**
   * Temperature percentage (0-100)
   * 0 = cool (high Kelvin), 100 = warm (low Kelvin)
   */
  temperature?: number;

  /**
   * Power state
   */
  on?: boolean;
}

/**
 * Tool to update the settings of all connected Key Lights
 */
export default async function tool(input: SettingsInput): Promise<ToolResponse<SettingsInput>> {
  try {
    const keyLight = await discoverKeyLights();

    // Convert the temperature if provided
    const settings: SettingsInput = {
      ...input,
      temperature: input.temperature !== undefined ? convertFormTemperatureToActual(input.temperature) : undefined,
    };

    await keyLight.update(settings);

    return {
      success: true,
      message: "Key Light settings updated",
      data: input, // Return the original input values, not the converted ones
    };
  } catch (error) {
    return {
      ...formatErrorResponse(error, "update Key Light settings"),
      data: input, // Return the original input even in case of error
    };
  }
}

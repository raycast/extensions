import { executeTool, ToolResponse } from "./utils";

type Input = {
  /**
   * The color temperature in Kelvin (2900-7000). Lower values are warmer, higher values are cooler.
   */
  temperature: number;
};

/**
 * Set the color temperature of Elgato light(s) to a specific Kelvin value
 */
export default async function tool(input: Input): Promise<ToolResponse> {
  const { temperature } = input;

  if (temperature < 2900 || temperature > 7000) {
    return { success: false, message: "Temperature must be between 2900 and 7000" };
  }

  try {
    await executeTool(["temperature", String(temperature)]);
    return { success: true, message: `Temperature set to ${temperature}K` };
  } catch {
    return { success: false, message: "Failed to set temperature" };
  }
}

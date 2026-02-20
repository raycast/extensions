import { defaultBrightness, defaultTemperature } from "../lib/utils";
import { executeTool, ToolResponse } from "./utils";

/**
 * Turn on Elgato light(s) with the configured default brightness and temperature
 */
export default async function tool(): Promise<ToolResponse> {
  try {
    await executeTool(["on", "--temperature", defaultTemperature(), "--brightness", defaultBrightness()]);
    return { success: true, message: "Lights turned on" };
  } catch {
    return { success: false, message: "Failed to turn on lights" };
  }
}

import { dayLightBrightness, dayLightTemperature } from "../lib/utils";
import { executeTool, ToolResponse } from "./utils";

/**
 * Turn on Elgato light(s) with the configured day light brightness and temperature preset
 */
export default async function tool(): Promise<ToolResponse> {
  try {
    await executeTool(["on", "--temperature", dayLightTemperature(), "--brightness", dayLightBrightness()]);
    return { success: true, message: "Lights turned on with day light settings" };
  } catch {
    return { success: false, message: "Failed to turn on day light" };
  }
}

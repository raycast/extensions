import { nightLightBrightness, nightLightTemperature } from "../lib/utils";
import { executeTool, ToolResponse } from "./utils";

/**
 * Turn on Elgato light(s) with the configured night light brightness and temperature preset
 */
export default async function tool(): Promise<ToolResponse> {
  try {
    await executeTool(["on", "--temperature", nightLightTemperature(), "--brightness", nightLightBrightness()]);
    return { success: true, message: "Lights turned on with night light settings" };
  } catch {
    return { success: false, message: "Failed to turn on night light" };
  }
}

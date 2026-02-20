import { executeTool, ToolResponse } from "./utils";

/**
 * Turn off Elgato light(s)
 */
export default async function tool(): Promise<ToolResponse> {
  try {
    await executeTool(["off"]);
    return { success: true, message: "Lights turned off" };
  } catch {
    return { success: false, message: "Failed to turn off lights" };
  }
}

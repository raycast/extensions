import { brightnessChangeAmount } from "../lib/utils";
import { executeTool, ToolResponse } from "./utils";

/**
 * Decrease the brightness of Elgato light(s) by the configured increment amount
 */
export default async function tool(): Promise<ToolResponse> {
  try {
    await executeTool(["brightness", "--", `-${brightnessChangeAmount()}`]);
    return { success: true, message: `Brightness decreased by ${brightnessChangeAmount()}%` };
  } catch {
    return { success: false, message: "Failed to decrease brightness" };
  }
}

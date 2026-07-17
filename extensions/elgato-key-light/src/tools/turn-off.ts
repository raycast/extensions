import { discoverKeyLights, ToolResponse, formatErrorResponse, getTargetLightNames } from "../utils";

/**
 * Tool to turn off all connected Key Lights
 */
export default async function tool(): Promise<ToolResponse> {
  try {
    const keyLight = await discoverKeyLights();
    const targets = await getTargetLightNames();

    await keyLight.turnOff(targets);

    return {
      success: true,
      message: "Key Lights turned off",
    };
  } catch (error) {
    return formatErrorResponse(error, "turn off Key Lights");
  }
}

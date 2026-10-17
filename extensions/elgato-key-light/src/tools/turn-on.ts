import { discoverKeyLights, ToolResponse, formatErrorResponse, getTargetLightNames } from "../utils";

/**
 * Tool to turn on all connected Key Lights
 */
export default async function tool(): Promise<ToolResponse> {
  try {
    const keyLight = await discoverKeyLights();
    const targets = await getTargetLightNames();

    await keyLight.turnOn(targets);

    return {
      success: true,
      message: "Key Lights turned on",
    };
  } catch (error) {
    return formatErrorResponse(error, "turn on Key Lights");
  }
}

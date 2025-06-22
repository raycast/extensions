import { KeyLight } from "../elgato";
import { discoverKeyLights, ToolResponse, formatErrorResponse } from "../utils";

/**
 * Tool to get information about discovered Key Lights
 *
 * Note: Due to API limitations, this tool can only return basic information
 * about the lights (name, address) rather than their full settings.
 */
export default async function tool(): Promise<
  ToolResponse<Array<{ id: string; connected: boolean; address: string }>>
> {
  try {
    // Discover key lights without assigning to unused variable
    await discoverKeyLights();

    if (!KeyLight.keyLights || KeyLight.keyLights.length === 0) {
      return {
        success: false,
        message: "No Key Lights were discovered",
        error: "No Key Lights were found on your network",
        data: [], // Add empty array to satisfy type
      };
    }

    // Since we can't directly access light statuses with a public method,
    // we'll return a simplified result with the light names and the fact they're connected
    const lightsInfo = KeyLight.keyLights.map((light) => ({
      id: light.service.name,
      connected: true,
      address: light.service.referer.address,
    }));

    return {
      success: true,
      message: `Found ${lightsInfo.length} Key Light${lightsInfo.length !== 1 ? "s" : ""}`,
      data: lightsInfo,
    };
  } catch (error) {
    // Cast the error response to include the required data type
    return {
      ...formatErrorResponse(error, "get Key Light information"),
      data: [], // Add empty array to satisfy type
    };
  }
}

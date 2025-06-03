import { getPresets, Preset } from "../presets";
import { ToolResponse, formatErrorResponse } from "../utils";

/**
 * Tool to get all saved presets
 */
export default async function tool(): Promise<ToolResponse<Preset[]>> {
  try {
    const presets = await getPresets();

    return {
      success: true,
      message: `Found ${presets.length} preset${presets.length !== 1 ? "s" : ""}`,
      data: presets,
    };
  } catch (error) {
    return {
      ...formatErrorResponse(error, "get presets"),
      data: [],
    };
  }
}

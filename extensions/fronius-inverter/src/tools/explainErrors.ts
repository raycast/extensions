import { AI, getPreferenceValues } from "@raycast/api";
import { fetchInverterInfo } from "../api";
import { InverterInfo } from "../types";

interface Preferences {
  baseUrl: string;
}

/**
 * Provides an explanation and troubleshooting steps for Fronius inverter error codes
 *
 * This tool fetches the current inverter status directly from the Fronius API,
 * identifies any active error codes, and uses Raycast's AI capabilities to provide
 * detailed explanations and troubleshooting guidance.
 *
 * The tool is designed to help users understand and resolve inverter issues without
 * needing to look up error codes in the manual or contact technical support for
 * common problems. It provides context-aware explanations based on the current
 * state of the inverter.
 *
 * If no errors are detected, the tool returns a simple confirmation message.
 *
 * @returns {Promise<string>} Explanation of error codes with troubleshooting steps,
 *                           or a confirmation message if no errors are detected
 */
export default async function explainErrors(): Promise<string> {
  // Get the base URL from user preferences
  const { baseUrl } = getPreferenceValues<Preferences>();

  try {
    // Fetch the latest inverter information directly from the Fronius API
    const invResponse = await fetchInverterInfo(baseUrl);
    const invData = invResponse.Body.Data;

    // Extract and organize inverter data, including error codes
    const inverters = Object.entries(invData).map(([id, info]) => ({
      id,
      info: info as InverterInfo,
    }));

    // Filter out inverters with no errors (ErrorCode 0 or -1 indicates no error)
    const errorCodes = inverters
      .filter((inv) => inv.info.ErrorCode !== 0 && inv.info.ErrorCode !== -1)
      .map((inv) => String(inv.info.ErrorCode));

    // If no errors are detected, return a simple confirmation message
    if (errorCodes.length === 0) {
      return "No errors detected. All inverters are operating normally.";
    }

    // Prepare a status message with information about each inverter
    const statusMessage = inverters
      .map((inv) => `${inv.info.CustomName || `Inverter ${inv.id}`}: ${inv.info.InverterState}`)
      .join(", ");

    // Use Raycast AI to analyze the error codes and provide troubleshooting guidance
    return await AI.ask(`
      Analyze this Fronius inverter error:
      Error codes: ${errorCodes.join(", ")}
      Status: ${statusMessage}
      
      Please provide:
      1. A brief explanation of what this error means
      2. Potential causes for this issue
      3. Recommended troubleshooting steps
      
      Keep it concise and practical.
    `);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch inverter info: ${errorMessage}`);
  }
}

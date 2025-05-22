import { AI, getPreferenceValues } from "@raycast/api";
import { fetchPowerFlowRealtimeData } from "../api";

interface Preferences {
  baseUrl: string;
}

/**
 * Analyzes the current state of the Fronius solar system using AI
 *
 * This tool fetches real-time data directly from the Fronius inverter API and uses
 * Raycast's AI capabilities to provide meaningful insights about the system's performance.
 * The analysis includes information about current production, consumption patterns,
 * grid interaction, and battery status (if available).
 *
 * The tool is designed to help users understand their solar system's current state
 * at a glance and identify potential optimization opportunities or issues.
 *
 * @returns {Promise<string>} A detailed analysis of the system state with insights and recommendations
 */
export default async function analyzeSystem(): Promise<string> {
  // Get the base URL from user preferences
  const { baseUrl } = getPreferenceValues<Preferences>();

  // Fetch the latest power flow data directly from the Fronius API
  try {
    const powerResponse = await fetchPowerFlowRealtimeData(baseUrl);
    const site = powerResponse.Body.Data.Site;

    // Extract and organize the relevant data for analysis
    const data = {
      currentPower: site.P_PV, // Current solar production in watts
      dailyEnergy: site.E_Total || 0, // Total energy produced today in watt-hours
      gridPower: site.P_Grid, // Grid power (negative = exporting to grid) in watts
      loadPower: site.P_Load, // Current home consumption in watts
      batteryPower: site.P_Akku, // Battery power (negative = charging) in watts
      batteryStateOfCharge: site.StateOfCharge_Relative, // Battery charge level in percentage
    };

    // Use Raycast AI to analyze the data and generate insights
    return await AI.ask(`
      Analyze this solar system data and provide insights:
      - Current production: ${data.currentPower}W
      - Today's energy: ${data.dailyEnergy}Wh
      - Grid power (negative=export): ${data.gridPower}W
      - Home consumption: ${data.loadPower}W
      ${data.batteryPower !== undefined ? `- Battery power (negative=charging): ${data.batteryPower}W` : ""}
      ${data.batteryStateOfCharge !== undefined ? `- Battery charge: ${data.batteryStateOfCharge}%` : ""}
      
      Please provide:
      1. A brief summary of the current system state
      2. Any notable observations (high/low production, consumption patterns)
      3. One actionable insight based on the current energy flow
      
      Keep it concise (3-4 sentences total).
    `);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch power flow data: ${errorMessage}`);
  }
}

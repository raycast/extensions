import { AI, getPreferenceValues } from "@raycast/api";
import { fetchPowerFlowRealtimeData } from "../api";

interface Preferences {
  baseUrl: string;
}

/**
 * Provides optimization suggestions for the Fronius solar system
 *
 * This tool fetches real-time data from the Fronius API, calculates key performance
 * metrics, and uses Raycast's AI capabilities to generate practical optimization
 * suggestions tailored to the current system state.
 *
 * The suggestions focus on ways to improve energy efficiency, maximize self-consumption,
 * optimize battery usage (if present), and enhance overall system performance.
 * The recommendations are designed to be actionable by homeowners without requiring
 * technical expertise or professional assistance.
 *
 * The tool uses current power production, estimated daily production, peak power,
 * and grid export percentage to provide context-aware recommendations.
 *
 * @returns {Promise<string>} Practical optimization suggestions based on current system performance
 */
export default async function optimizationSuggestions(): Promise<string> {
  // Get the base URL from user preferences
  const { baseUrl } = getPreferenceValues<Preferences>();

  // Fetch the latest power flow data directly from the Fronius API
  const powerResponse = await fetchPowerFlowRealtimeData(baseUrl);
  const site = powerResponse.Body.Data.Site;

  // Calculate derived performance metrics for optimization analysis
  const currentPower = site.P_PV; // Current solar production in watts
  const averageDailyProduction = site.E_Total || 0; // Using today's total as a proxy for daily production
  const peakPower = currentPower * 1.2; // Estimate peak power capacity (20% higher than current)

  // Calculate grid export percentage - how much of produced power is being exported
  // A high percentage might indicate opportunities for better self-consumption
  const gridExportPercentage = site.P_Grid < 0 ? (Math.abs(site.P_Grid) / site.P_PV) * 100 : 0;

  // Use Raycast AI to generate optimization suggestions based on the calculated metrics
  return await AI.ask(`
    Based on this Fronius solar system data:
    - Current power: ${currentPower}W
    - Average daily production: ${averageDailyProduction}Wh
    - System peak power: ${peakPower}W
    - Grid export percentage: ${gridExportPercentage}%
    
    Provide 2-3 practical suggestions to optimize energy usage and system performance.
    Focus on actionable tips that a homeowner could implement.
  `);
}

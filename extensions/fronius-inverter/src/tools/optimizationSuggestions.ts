import { AI, getPreferenceValues } from "@raycast/api";
import { fetchPowerFlowRealtimeData } from "../api";
import { SiteData } from "../types";

interface Preferences {
  baseUrl: string;
}

// Extended site data interface to include optional E_Day property
interface ExtendedSiteData extends SiteData {
  E_Day?: number;
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

  try {
    // Fetch the latest power flow data directly from the Fronius API
    const powerResponse = await fetchPowerFlowRealtimeData(baseUrl);
    const site = powerResponse.Body.Data.Site as ExtendedSiteData;

    // Calculate derived performance metrics for optimization analysis
    const currentPower = site.P_PV; // Current solar production in watts

    // Try to use E_Day (today's production) if available, otherwise fall back to E_Total
    const dailyProduction = site.E_Day || site.E_Total || 0;
    const dailyLabel = site.E_Day ? "Today's energy production" : "Total energy production";

    const peakPower = currentPower * 1.2; // Estimate peak power capacity (20% higher than current)

    // Calculate grid export percentage - how much of produced power is being exported
    // A high percentage might indicate opportunities for better self-consumption
    const gridExportPercentage = site.P_Grid < 0 && site.P_PV !== 0 ? (Math.abs(site.P_Grid) / site.P_PV) * 100 : 0;

    // Use Raycast AI to generate optimization suggestions based on the calculated metrics
    return await AI.ask(`
      Based on this Fronius solar system data:
      - Current power: ${currentPower}W
      - ${dailyLabel}: ${dailyProduction}Wh
      - System peak power: ${peakPower}W
      - Grid export percentage: ${gridExportPercentage}%
      
      Provide 2-3 practical suggestions to optimize energy usage and system performance.
      Focus on actionable tips that a homeowner could implement.
    `);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch power flow data: ${errorMessage}`);
  }
}

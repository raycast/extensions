import { getPreferenceValues } from "@raycast/api";
import { fetchPrinterStats } from "../snmp-client";
import { getOidConfig } from "../constants";

/**
 * Tool: Ask Printer
 * Fetches printer statistics using configured preferences and returns the result.
 *
 * @returns {Promise<any>} Printer stats object fetched via SNMP
 * @throws {Error} When SNMP fetch fails
 */
export default async function askXeroxTool() {
  const preferences = getPreferenceValues<Preferences>();
  try {
    const stats = await fetchPrinterStats(
      preferences.printerIp,
      preferences.snmpCommunity || "public",
      getOidConfig(preferences),
    );
    return stats;
  } catch (error) {
    throw new Error(`Failed to fetch printer stats: ${error instanceof Error ? error.message : String(error)}`);
  }
}

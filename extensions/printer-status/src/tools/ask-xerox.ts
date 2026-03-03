import { getPreferenceValues } from "@raycast/api";
import { fetchPrinterStats } from "../snmp-client";

export default async function () {
  const preferences = getPreferenceValues<Preferences>();
  try {
    const stats = await fetchPrinterStats(preferences.printerIp, preferences.snmpCommunity || "public");
    return stats;
  } catch (error) {
    throw new Error(`Failed to fetch printer stats: ${error instanceof Error ? error.message : String(error)}`);
  }
}

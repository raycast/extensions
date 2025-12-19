import { getPreferenceValues } from "@raycast/api";
import { fetchPrinterStats } from "../snmp-client";

export default async function () {
  const preferences = getPreferenceValues<{ printerIp: string }>();
  try {
    const stats = await fetchPrinterStats(preferences.printerIp);
    return stats;
  } catch (error) {
    throw new Error(`Failed to fetch printer stats: ${error instanceof Error ? error.message : String(error)}`);
  }
}

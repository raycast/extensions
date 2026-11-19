import { getPreferenceValues } from "@raycast/api";
import { getLocalIPs } from "./local-ips";
import { fetchFromSource, IP_SOURCES } from "./sources";
import { IPCollection, IPEntry, SourceFailure } from "./types";
import { isUsablePublicIP } from "./valid-ip";

/** Fetch every enabled source in parallel; a failing source never blocks the others. */
export async function collectIPs(): Promise<IPCollection> {
  const preferences = getPreferenceValues<Preferences>();

  const entries: IPEntry[] = preferences.getLocalIPs ? getLocalIPs() : [];
  const failures: SourceFailure[] = [];

  const enabled = IP_SOURCES.filter((source) => preferences[source.id]);
  const results = await Promise.all(enabled.map(fetchFromSource));

  for (const result of results) {
    if (result.entry) entries.push(result.entry);
    if (result.failure) failures.push(result.failure);
  }

  return { entries, failures };
}

/** Only public addresses are worth a geo lookup — reserved ranges always come back empty. */
export function geoLookupTargets(entries: IPEntry[]): string[] {
  return entries.filter((entry) => isUsablePublicIP(entry.ip)).map((entry) => entry.ip);
}

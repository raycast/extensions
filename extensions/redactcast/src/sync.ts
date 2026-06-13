import { getPreferenceValues, LocalStorage } from "@raycast/api";
import fetch from "node-fetch";
import { type PersistedRule } from "./engine";

export async function syncRules(): Promise<number> {
  const { teamApiKey } = getPreferenceValues<{ teamApiKey?: string }>();
  if (!teamApiKey) {
    // If no key, clear previously synced rules
    await LocalStorage.removeItem("team_rules");
    return 0;
  }

  const response = await fetch("https://redactcast-api.themax98000.workers.dev/v1/rules", {
    headers: { Authorization: `Bearer ${teamApiKey}` }
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  const rules = await response.json() as any[];
  
  // Map backend rules to local PersistedRule format
  const mappedRules: PersistedRule[] = rules.map((r: any) => ({
    id: r.id,
    patternSource: r.pattern,
    tokenType: r.tokenType
  }));

  await LocalStorage.setItem("team_rules", JSON.stringify(mappedRules));
  return mappedRules.length;
}

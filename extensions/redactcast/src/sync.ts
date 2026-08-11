import { getPreferenceValues, LocalStorage } from "@raycast/api";

import { type PersistedRule } from "./engine";

export async function syncRules(): Promise<number> {
  const { teamApiKey } = getPreferenceValues();
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

  const rules = (await response.json()) as {
    id: string;
    value?: string;
    pattern?: string; // legacy field name; always treated as a literal value
    tokenType: string;
  }[];

  // Map backend rules to local PersistedRule format. The matched text is a
  // literal string (never a regex), so remote rules cannot express a ReDoS.
  const mappedRules: PersistedRule[] = rules.map(r => ({
    id: r.id,
    value: r.value ?? r.pattern ?? "",
    tokenType: r.tokenType
  }));

  await LocalStorage.setItem("team_rules", JSON.stringify(mappedRules));
  return mappedRules.length;
}

// Search suggestions as the field shows them, from the engine the
// preference names. Nothing is sent while the preference says None.

import { getPreferenceValues } from "@raycast/api";

export async function suggestions(text: string, signal?: AbortSignal): Promise<string[]> {
  const source = getPreferenceValues<Preferences>().suggestions ?? "google";
  const q = encodeURIComponent(text.trim());
  if (!q || source === "none") return [];
  try {
    if (source === "duckduckgo") {
      const res = await fetch(`https://duckduckgo.com/ac/?q=${q}&type=list`, { signal });
      const body = (await res.json()) as [string, string[]];
      return body[1] ?? [];
    }
    const res = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&q=${q}`, { signal });
    const body = (await res.json()) as [string, string[]];
    return body[1] ?? [];
  } catch {
    return [];
  }
}

import { expandLegacySettings } from "./core-settings";
import type { SourceItem } from "./source-items";
import type { Profile } from "./storage";

/** Resolve category-wide choices against the source vault at the time of use. */
export function resolveProfileItems(profile: Profile, source: SourceItem[]): string[] {
  const available = new Set(source.map((item) => item.id));
  const chosen = new Set(expandLegacySettings(profile.items, [...available]).filter((id) => available.has(id)));
  for (const item of source) {
    if ((profile.allPlugins && item.category === "plugins") || (profile.allSnippets && item.category === "snippets")) {
      chosen.add(item.id);
    }
  }
  return [...chosen];
}

import { loadDetails } from "../lib/docpage";
import { entryUrl } from "../lib/entry-url";
import { loadGuides } from "../lib/guides";
import { loadInventory } from "../lib/inventory";
import { ensureMeta } from "../lib/metadata";
import { getPreferences } from "../lib/preferences";
import { searchEntries } from "../lib/search";
import { EntryKind } from "../lib/types";

type Input = {
  /** What to look for, for example "getScheduler", "PlayerJoinEvent" or "region scheduler". */
  query: string;
  /** Restrict the results to one kind of documentation entry. */
  kind?: EntryKind;
  /** How many entries to return. Defaults to 5, maximum 10. */
  limit?: number;
};

const DESCRIPTION_LIMIT = 1200;

export default async function searchDocs(input: Input) {
  const { docsVersion } = getPreferences();
  const [inventory, guides] = await Promise.all([
    loadInventory(docsVersion),
    loadGuides(),
  ]);
  const entries = [...inventory.entries, ...guides];
  const meta = await ensureMeta(inventory.entries, docsVersion);

  const scope = input.kind
    ? entries.filter((entry) => entry.kind === input.kind)
    : entries;
  const matches = searchEntries(scope, input.query).slice(
    0,
    Math.min(input.limit ?? 5, 10),
  );

  const results = await Promise.all(
    matches.map(async (entry) => {
      const details = await loadDetails(entry);
      const badges = meta[entry.name];
      return {
        name: entry.name,
        kind: entry.kind,
        signature: details.signature,
        deprecated: badges?.deprecated ?? false,
        notSupportedOnFolia: badges?.legacyScheduler ?? false,
        documentation: details.markdown.slice(0, DESCRIPTION_LIMIT),
        example: details.example,
        url: entryUrl(entry),
      };
    }),
  );

  return {
    version: inventory.version,
    results,
    note: "Every field comes from the official Folia Javadoc and PaperMC guides for the indexed version. Do not invent APIs that are absent from these results, and prefer GlobalRegionScheduler/RegionScheduler/EntityScheduler/AsyncScheduler over BukkitScheduler for anything Folia-specific.",
  };
}

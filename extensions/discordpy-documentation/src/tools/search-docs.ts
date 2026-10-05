import { loadDetails } from "../lib/docpage";
import { loadFaq } from "../lib/faq";
import { loadInventory } from "../lib/inventory";
import { ensureMeta } from "../lib/metadata";
import { searchEntries } from "../lib/search";
import { EntryKind } from "../lib/types";

type Input = {
  /** What to look for, for example "wait_for", "on_member_join" or "guild channel". */
  query: string;
  /** Restrict the results to one kind of documentation entry. */
  kind?: EntryKind;
  /** How many entries to return. Defaults to 5, maximum 10. */
  limit?: number;
};

const DESCRIPTION_LIMIT = 1200;

export default async function searchDocs(input: Input) {
  const [inventory, faq] = await Promise.all([loadInventory(), loadFaq()]);
  const entries = [...inventory.entries, ...faq];
  const meta = await ensureMeta(inventory.entries);

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
      const badges = meta[entry.anchor];
      return {
        name: entry.name,
        kind: entry.kind,
        signature: details.signature,
        coroutine: badges?.coroutine ?? false,
        requiredIntents: badges?.intents ?? [],
        documentation: details.markdown.slice(0, DESCRIPTION_LIMIT),
        example: details.example,
        url: entry.url,
      };
    }),
  );

  return {
    version: inventory.version,
    results,
    note: "Every field comes from the official discord.py documentation for the indexed version. Do not invent APIs that are absent from these results.",
  };
}

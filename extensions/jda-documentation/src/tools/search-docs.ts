import { loadDetails } from "../lib/docpage";
import { loadFaq } from "../lib/faq";
import { loadInventory } from "../lib/inventory";
import { ensureMeta } from "../lib/metadata";
import { searchEntries } from "../lib/search";
import { EntryKind } from "../lib/types";
import { loadGuides } from "../lib/wiki";

type Input = {
  /** What to look for, for example "sendMessage", "MessageReceivedEvent" or "slash command". */
  query: string;
  /** Restrict the results to one kind of documentation entry. */
  kind?: EntryKind;
  /** How many entries to return. Defaults to 5, maximum 10. */
  limit?: number;
};

const DESCRIPTION_LIMIT = 1200;

export default async function searchDocs(input: Input) {
  const [inventory, guides, faq] = await Promise.all([
    loadInventory(),
    loadGuides(),
    loadFaq(),
  ]);
  const entries = [...inventory.entries, ...guides, ...faq];
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
      const badges = meta[entry.name];
      return {
        name: entry.name,
        kind: entry.kind,
        signature: details.signature,
        returns: badges?.returns ?? null,
        mustBeQueued: badges?.queue ?? false,
        requiredIntents: badges?.intents ?? [],
        requiredPermissions: badges?.permissions ?? [],
        deprecated: badges?.deprecated ?? false,
        documentation: details.markdown.slice(0, DESCRIPTION_LIMIT),
        example: details.example,
        url: entry.url,
      };
    }),
  );

  return {
    version: inventory.version,
    results,
    note: "Every field comes from the official JDA Javadoc and wiki for the indexed version. Do not invent APIs that are absent from these results.",
  };
}

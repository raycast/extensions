import { loadDetails } from "../lib/docpage";
import { loadFaq } from "../lib/faq";
import { loadInventory } from "../lib/inventory";
import { ensureMeta } from "../lib/metadata";
import { findEntry, membersOf, searchEntries } from "../lib/search";
import { loadGuides } from "../lib/wiki";

const MEMBER_LIMIT = 80;

type Input = {
  /** The qualified name, for example "net.dv8tion.jda.api.entities.Guild" or "net.dv8tion.jda.api.entities.Guild#getMembers()". */
  name: string;
  /** Include the list of the type's own fields, constants and methods. Useful for a class or interface. */
  includeMembers?: boolean;
};

export default async function readEntry(input: Input) {
  const [inventory, guides, faq] = await Promise.all([
    loadInventory(),
    loadGuides(),
    loadFaq(),
  ]);
  const entries = [...inventory.entries, ...guides, ...faq];

  const entry =
    findEntry(entries, input.name) ??
    entries.find(
      (candidate) => candidate.name.toLowerCase() === input.name.toLowerCase(),
    ) ??
    searchEntries(entries, input.name)[0];

  if (!entry) {
    return {
      found: false,
      message: `No entry named "${input.name}" exists in the JDA documentation.`,
    };
  }

  const [details, meta] = await Promise.all([
    loadDetails(entry),
    ensureMeta(inventory),
  ]);
  const badges = meta[entry.name];

  return {
    found: true,
    name: entry.name,
    kind: entry.kind,
    signature: details.signature,
    returns: badges?.returns ?? null,
    mustBeQueued: badges?.queue ?? false,
    requiredIntents: badges?.intents ?? [],
    requiredPermissions: badges?.permissions ?? [],
    deprecated: badges?.deprecated ?? false,
    documentation: details.markdown,
    example: details.example,
    references: details.references,
    members: input.includeMembers
      ? membersOf(inventory.entries, entry)
          .slice(0, MEMBER_LIMIT)
          .map((member) => member.display)
      : undefined,
    url: entry.url,
  };
}

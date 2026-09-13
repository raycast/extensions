import { loadDetails } from "../lib/docpage";
import { entryUrl } from "../lib/entry-url";
import { loadGuides } from "../lib/guides";
import { loadInventory } from "../lib/inventory";
import { ensureMeta } from "../lib/metadata";
import { getPreferences } from "../lib/preferences";
import { membersOf, searchEntries } from "../lib/search";

const MEMBER_LIMIT = 80;

type Input = {
  /** The qualified name, for example "org.bukkit.entity.Player" or "org.bukkit.entity.Player#getScheduler()". */
  name: string;
  /** Include the list of the type's own fields, constants and methods. Useful for a class or interface. */
  includeMembers?: boolean;
};

export default async function readEntry(input: Input) {
  const { docsVersion, includeGuides = true } = getPreferences();
  const [inventory, guides] = await Promise.all([
    loadInventory(docsVersion),
    includeGuides ? loadGuides() : Promise.resolve([]),
  ]);
  const entries = includeGuides
    ? [...inventory.entries, ...guides]
    : inventory.entries;

  const entry =
    entries.find((candidate) => candidate.name === input.name) ??
    entries.find(
      (candidate) => candidate.name.toLowerCase() === input.name.toLowerCase(),
    ) ??
    searchEntries(entries, input.name)[0];

  if (!entry) {
    return {
      found: false,
      message: `No entry named "${input.name}" exists in the Folia documentation.`,
    };
  }

  const [details, meta] = await Promise.all([
    loadDetails(entry),
    ensureMeta(inventory.entries, docsVersion),
  ]);
  const badges = meta[entry.name];

  return {
    found: true,
    name: entry.name,
    kind: entry.kind,
    signature: details.signature,
    deprecated: badges?.deprecated ?? false,
    notSupportedOnFolia: badges?.legacyScheduler ?? false,
    documentation: details.markdown,
    example: details.example,
    references: details.references,
    members: input.includeMembers
      ? membersOf(
          inventory.entries,
          entry,
          (candidate) => meta[candidate.name]?.deprecated ?? false,
        )
          .slice(0, MEMBER_LIMIT)
          .map((member) => member.display)
      : undefined,
    url: entryUrl(entry),
  };
}

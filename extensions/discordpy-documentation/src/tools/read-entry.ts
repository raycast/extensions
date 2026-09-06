import { loadDetails } from "../lib/docpage";
import { loadFaq } from "../lib/faq";
import { loadInventory } from "../lib/inventory";
import { ensureMeta } from "../lib/metadata";
import { membersOf, searchEntries } from "../lib/search";

type Input = {
  /** The fully qualified name, for example "discord.Client.wait_for" or "discord.ext.commands.Bot". */
  name: string;
  /** Include the list of the entry's own attributes, properties and methods. Useful for a class. */
  includeMembers?: boolean;
};

export default async function readEntry(input: Input) {
  const [inventory, faq] = await Promise.all([loadInventory(), loadFaq()]);
  const entries = [...inventory.entries, ...faq];

  const entry =
    entries.find((candidate) => candidate.name === input.name) ??
    entries.find(
      (candidate) => candidate.name.toLowerCase() === input.name.toLowerCase(),
    ) ??
    searchEntries(entries, input.name)[0];

  if (!entry) {
    return {
      found: false,
      message: `No entry named "${input.name}" exists in the discord.py documentation.`,
    };
  }

  const [details, meta] = await Promise.all([
    loadDetails(entry),
    ensureMeta(inventory.entries),
  ]);
  const badges = meta[entry.anchor];

  return {
    found: true,
    name: entry.name,
    kind: entry.kind,
    signature: details.signature,
    coroutine: badges?.coroutine ?? false,
    requiredIntents: badges?.intents ?? [],
    documentation: details.markdown,
    example: details.example,
    references: details.references,
    members: input.includeMembers
      ? membersOf(inventory.entries, entry).map((member) => member.name)
      : undefined,
    url: entry.url,
  };
}

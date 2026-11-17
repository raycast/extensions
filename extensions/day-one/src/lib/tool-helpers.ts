import { Entry, Journal, listJournals } from "./api";
import { cleanBody, placeLabel } from "./parse";

/**
 * Matches a journal by ID or by name, ignoring case. Throws a message the AI can act on.
 * Pass `journals` when you already have the list, to skip fetching it again.
 */
export async function resolveJournal(nameOrId: string, journals?: Journal[]): Promise<Journal> {
  journals ??= await listJournals();
  const wanted = nameOrId.trim().toLowerCase();
  const match = journals.find((j) => j.id === nameOrId.trim()) ?? journals.find((j) => j.name.toLowerCase() === wanted);
  if (!match) {
    throw new Error(`No journal named "${nameOrId}". Journals: ${journals.map((j) => j.name).join(", ")}`);
  }
  return match;
}

export function toolEntry(entry: Entry, journals: Map<string, Journal>, maxText = 2000) {
  const text = cleanBody(entry.body);
  return {
    id: entry.id,
    journalId: entry.journalId,
    journal: journals.get(entry.journalId)?.name,
    date: new Date(entry.date).toISOString(),
    timeZone: entry.timeZone,
    title: entry.title,
    tags: entry.tags,
    starred: entry.starred,
    place: entry.place ? placeLabel(entry.place) || undefined : undefined,
    photos: entry.photos,
    text: text.length > maxText ? `${text.slice(0, maxText)}…` : text,
    truncated: text.length > maxText,
  };
}

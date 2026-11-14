import { logger } from "@chrismessina/raycast-logger";
import { listJournals, readEntry } from "../lib/api";
import { toolEntry } from "../lib/tool-helpers";

const log = logger.child("[ai]");

type Input = {
  /** The entry's ID, from search-entries. */
  entryId: string;
  /** The ID of the entry's journal, from search-entries. */
  journalId: string;
};

/** Reads one Day One entry in full. */
export default async function tool(input: Input) {
  const [entry, journals] = await Promise.all([readEntry(input.journalId, input.entryId), listJournals()]);
  log.debug("get-entry", { chars: entry.body.length });
  return toolEntry(entry, new Map(journals.map((j) => [j.id, j])), 100_000);
}

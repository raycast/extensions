import { logger } from "@chrismessina/raycast-logger";
import { Tool } from "@raycast/api";
import { writeEntry } from "../lib/api";
import { isSyncRunning, startSync } from "../lib/sync";
import { resolveJournal } from "../lib/tool-helpers";

const log = logger.child("[ai]");

type Input = {
  /** The journal to write in, by name or ID. */
  journal: string;
  /** The entry text, in Markdown. The first line becomes the entry's title. */
  text: string;
  /** When the entry happened, as an ISO 8601 date and time. Defaults to now. */
  date?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const journal = await resolveJournal(input.journal);
  return {
    message: "Write this entry in Day One?",
    info: [
      { name: "Journal", value: journal.name },
      { name: "Date", value: input.date ? new Date(input.date).toLocaleString() : "Now" },
      { name: "Entry", value: input.text.length > 500 ? `${input.text.slice(0, 499)}…` : input.text },
    ],
  };
};

/**
 * Writes a new entry in one of the user's Day One journals, then starts uploading it. `uploading` is false when the
 * entry is saved but waits for the next sync.
 */
export default async function tool(input: Input) {
  const journal = await resolveJournal(input.journal);
  const date = input.date ? new Date(input.date) : undefined;
  if (date && Number.isNaN(date.getTime()))
    throw new Error(`"${input.date}" isn't a date. Use ISO 8601, like 2026-11-09T08:30:00-08:00.`);
  const result = await writeEntry({ journalId: journal.id, body: input.text, date });
  // A sync that's already running may have picked its uploads before this write, so it can't be counted on;
  // the entry is saved and goes up with the next sync.
  let uploading = !isSyncRunning();
  if (uploading) {
    try {
      await startSync();
    } catch {
      uploading = false;
    }
  }
  log.debug("create-entry", { chars: input.text.length, uploading });
  return { entryId: result.entryId, journalId: result.journalId, journal: journal.name, uploading };
}

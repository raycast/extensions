/** Creation intent only; delivery and recovery belong to SubmissionController. */
import { randomUUID } from "node:crypto";
import { Failure, type Session, type Submission } from "../helper";
import type { FormValues } from "../types";
import { canonicalUrl, findSaved, type SavedHit } from "./duplicates";
import { inputUrl } from "./url";

export const MAX_URLS = 10;
export type SaveEntry = { url: string; title?: string };
export type SaveValues = Pick<FormValues, "note" | "collection" | "tags"> & { entries: SaveEntry[] };
export class SaveInputError extends Failure {
  constructor(
    public fields: Record<number, string>,
    public hits: SavedHit[] = [],
  ) {
    super("INVALID", "Review the marked URLs. Nothing was saved.");
  }
}

export function validateEntries(entries: SaveEntry[]): SaveEntry[] {
  if (!entries.length || entries.length > MAX_URLS)
    throw new Failure("INVALID", "Enter between 1 and 10 URLs.");
  const fields: Record<number, string> = {};
  const seen = new Map<string, number>();
  const parsed = entries.map((entry, index) => {
    try {
      const url = inputUrl(entry.url);
      const key = canonicalUrl(url)!;
      const previous = seen.get(key);
      if (previous !== undefined) {
        fields[previous] = `Same page as URL ${index + 1}. Remove one row.`;
        fields[index] = `Same page as URL ${previous + 1}. Remove one row.`;
      } else seen.set(key, index);
      return { ...entry, url };
    } catch (error) {
      fields[index] = (error as Error).message;
      return entry;
    }
  });
  if (Object.keys(fields).length) throw new SaveInputError(fields);
  return parsed;
}

export function prepareSave(values: SaveValues, commandId: string, session: Session): Submission {
  const entries = validateEntries(values.entries);
  const parent = values.collection && !["-1", "-2"].includes(values.collection) ? values.collection : null;
  const order = Date.now();
  return {
    session,
    command: {
      id: commandId,
      libraryId: session.libraryId,
      edits: entries.map((entry, index) => ({
        entity: randomUUID(),
        kind: "bookmark",
        base: {},
        values: {
          url: entry.url,
          title: entry.title?.trim() || entry.url,
          note: values.note ?? "",
          description: "",
          position: { parent, order: order + index },
          favorite: false,
          type: "link",
          ...Object.fromEntries(values.tags.map((id) => ["tag:" + id, true])),
        },
      })),
    },
  };
}

/** Used by the form and integration checks, so duplicate rejection cannot bypass delivery. */
export async function prepareNewBookmarks(values: SaveValues, session: Session): Promise<Submission> {
  const entries = validateEntries(values.entries);
  const hits = await findSaved(
    session,
    entries.map((entry) => entry.url),
  );
  if (hits.length) {
    const keys = new Set(hits.map((hit) => canonicalUrl(hit.link)));
    throw new SaveInputError(
      Object.fromEntries(
        entries.flatMap((entry, index) =>
          keys.has(canonicalUrl(entry.url))
            ? [[index, "Already saved. View the existing bookmark or change/remove this URL."]]
            : [],
        ),
      ),
      hits,
    );
  }
  return prepareSave({ ...values, entries }, randomUUID(), session);
}

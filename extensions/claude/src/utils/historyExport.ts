import type { Conversation } from "../type";

/** Current export-format version. Bump if the shape ever changes incompatibly — this
 *  file is a compatibility surface the moment a future import feature reads it back. */
export const HISTORY_EXPORT_VERSION = 1;

/** The document shape written to a `.json` export file. Mirrors `presetYaml.ts`'s
 *  versioned-wrapper convention (`version` + a named list) rather than a bare array, so
 *  the two export formats this extension ships stay consistent with each other. */
export interface HistoryExportDocument {
  version: number;
  exported_at: string;
  conversations: Conversation[];
}

/**
 * Serializes every conversation, verbatim, to the native JSON export document.
 *
 * Deliberately NOT a partial projection: every field on `Conversation` — including the
 * Recents-owned ones (`archived`, `title`, `pinned_at`, `unpinned_at`, `pinned`) and the
 * full `model`/`chats` — is carried through unchanged, because a user exporting their
 * data expects everything they can see in Recents to be in the file, not a lossy subset.
 * Contains only the user's own conversation data — no API key, no preferences.
 *
 * `now` is injectable (matching `presetYaml.ts`'s `importPresetsFromYaml`) so tests can
 * assert on `exported_at` without depending on wall-clock time.
 */
export function exportConversationsToJson(
  conversations: Conversation[],
  now: () => string = () => new Date().toISOString(),
): string {
  const document: HistoryExportDocument = {
    version: HISTORY_EXPORT_VERSION,
    exported_at: now(),
    conversations,
  };

  return JSON.stringify(document, null, 2);
}

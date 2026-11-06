import type { ApiSave } from "pond-api";
import { saveTitle, sourceName } from "../lib/display";
import { saveLink } from "../lib/links";

export interface SaveSummary {
  id: string;
  libraryId: string;
  title: string;
  url: string;
  pondUrl: string;
  description: string | null;
  source: string;
  sourceName: string;
  author: string | null;
  kind: string | null;
  tags: string[];
  folderIds: string[];
  savedAt: string;
  rating: number | null;
  note: string | null;
  inTrash: boolean;
  hasText: boolean;
}

const NOTE_LIMIT = 500;
const DESCRIPTION_LIMIT = 300;

/** AI results stay small: raw saves carry media and status fields the model never needs. */
export function summarize(save: ApiSave): SaveSummary {
  return {
    id: save.id,
    libraryId: save.libraryId,
    title: saveTitle(save),
    url: save.url,
    pondUrl: saveLink(save),
    description: save.description ? clip(save.description, DESCRIPTION_LIMIT) : null,
    source: save.source,
    sourceName: sourceName(save.source),
    author: save.author,
    kind: save.kind,
    tags: save.tags,
    folderIds: save.folderIds,
    savedAt: new Date(save.savedAt).toISOString(),
    rating: save.rating || null,
    note: save.note ? clip(save.note, NOTE_LIMIT) : null,
    inTrash: save.deletedAt !== null,
    hasText: save.text.caption || save.text.ocr || save.text.transcript,
  };
}

export function clip(text: string, limit: number): string {
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

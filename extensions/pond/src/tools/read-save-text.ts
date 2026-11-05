import { pond } from "../api/client";
import { clip } from "../api/summary";
import { requireLibrary } from "../api/tools";

type Input = {
  /** Exact save ID from Search Saves. */
  id: string;
  /** Library ID returned with the save. */
  libraryId: string;
};

/** Transcripts can run to hours of speech; this keeps one read inside the model's context. */
const FIELD_LIMIT = 12_000;

export default async function tool(input: Input) {
  await requireLibrary(input.libraryId);
  const text = await pond().text(input.id);
  return {
    id: text.id,
    title: text.title,
    description: clip(text.description, FIELD_LIMIT),
    note: clip(text.note, FIELD_LIMIT),
    caption: clip(text.caption, FIELD_LIMIT),
    textInImages: clip(text.ocr, FIELD_LIMIT),
    transcript: clip(text.transcript, FIELD_LIMIT),
  };
}

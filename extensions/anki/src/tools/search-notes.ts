import { ankiReq } from '../api/ankiClient';
import { serializeNote } from './note-utils';

type Input = {
  /** Anki search syntax, for example deck:"Biology" tag:exam. Empty searches all notes. */
  query: string;
  /** Zero-based offset. Use nextOffset from the previous result to continue the same query. */
  offset?: number;
  /** Number of notes to return, from 1 to 50. Defaults to 20. */
  limit?: number;
};

export default async function tool({ query, offset = 0, limit = 20 }: Input) {
  if (typeof query !== 'string') throw new Error('Provide an Anki search query.');
  if (!Number.isSafeInteger(offset) || offset < 0)
    throw new Error('Offset must be a nonnegative integer.');
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50)
    throw new Error('Limit must be between 1 and 50.');
  const ids = (await ankiReq('findNotes', { query: query.trim() })).sort((a, b) => a - b);
  const pageIds = ids.slice(offset, offset + limit);
  const notes = pageIds.length ? await ankiReq('notesInfo', { notes: pageIds }) : [];
  const hasMore = offset + limit < ids.length;
  return {
    query,
    total: ids.length,
    notes: notes.filter(note => note.noteId).map(serializeNote),
    hasMore,
    nextOffset: hasMore ? offset + limit : null,
  };
}

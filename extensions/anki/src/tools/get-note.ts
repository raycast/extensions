import { getNote, serializeNote } from './note-utils';

type Input = {
  /** Exact note ID returned by search-notes or provided by the user. This is not a card ID. */
  noteId: number;
};

export default async function tool({ noteId }: Input) {
  return serializeNote(await getNote(noteId));
}

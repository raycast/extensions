import { Tool } from '@raycast/api';
import noteActions from '../api/noteActions';
import {
  fieldsRecord,
  getNote,
  mutationResult,
  NoteFieldInput,
  validateFieldNames,
  validateTags,
} from './note-utils';
import { EditNoteParams } from '../types';

type Input = {
  /** Exact note ID from search-notes or get-note. This is not a card ID. */
  noteId: number;
  /** Only fields to change. Omitted fields keep their values. Empty string clears a field. */
  fields?: NoteFieldInput[];
  /** Complete replacement tag list. Omit to preserve tags; [] removes all tags. */
  tags?: string[];
};

async function prepare(input: Input): Promise<EditNoteParams> {
  const note = await getNote(input.noteId);
  validateTags(input.tags);
  if (input.fields !== undefined) {
    const fields = fieldsRecord(input.fields);
    validateFieldNames(fields, Object.keys(note.fields));
    return { id: input.noteId, fields, ...(input.tags !== undefined ? { tags: input.tags } : {}) };
  }
  if (input.tags !== undefined) return { id: input.noteId, tags: input.tags };
  throw new Error('Provide fields or tags to update.');
}

export const confirmation: Tool.Confirmation<Input> = async (input: Input) => {
  const note = await prepare(input);
  return {
    message: 'Update this note and all cards generated from it?',
    info: [
      { name: 'Note ID', value: String(note.id) },
      ...Object.entries(note.fields ?? {}).map(([name, value]) => ({
        name,
        value: value || '(empty)',
      })),
      ...(note.tags !== undefined
        ? [{ name: 'Replace Tags', value: note.tags.join(', ') || '(remove all tags)' }]
        : []),
    ],
  };
};

export default async function tool(input: Input) {
  const note = await prepare(input);
  return mutationResult(async () => {
    await noteActions.updateNote(note);
    return { noteId: note.id };
  });
}

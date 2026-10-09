import { ankiReq } from '../api/ankiClient';
import { Note } from '../types';
import { AnkiError, AnkiUncertainError } from '../error/AnkiError';

export type NoteFieldInput = { name: string; value: string };

export function fieldsRecord(fields: NoteFieldInput[]): Record<string, string> {
  if (!Array.isArray(fields) || fields.length === 0) throw new Error('Provide at least one field.');
  const names = new Set<string>();
  for (const field of fields) {
    if (
      !field ||
      typeof field.name !== 'string' ||
      !field.name ||
      typeof field.value !== 'string'
    ) {
      throw new Error('Each field must have a name and a string value.');
    }
    if (names.has(field.name))
      throw new Error(`Field "${field.name}" was provided more than once.`);
    names.add(field.name);
  }
  return Object.fromEntries(fields.map(field => [field.name, field.value]));
}

export function validateTags(tags: string[] | undefined): void {
  if (tags === undefined) return;
  if (!Array.isArray(tags) || tags.some(tag => typeof tag !== 'string' || !tag || /\s/.test(tag))) {
    throw new Error(
      'Tags must be nonempty strings without spaces. Use underscores for multiple words.'
    );
  }
}

export function validateNoteId(noteId: number): void {
  if (!Number.isSafeInteger(noteId) || noteId <= 0)
    throw new Error('Provide a valid note ID from search-notes or get-note.');
}

export async function getNote(noteId: number): Promise<Note> {
  validateNoteId(noteId);
  const [note] = await ankiReq('notesInfo', { notes: [noteId] });
  if (!note || note.noteId !== noteId) throw new Error(`Note ${noteId} no longer exists.`);
  return note;
}

export function serializeNote(note: Note) {
  return {
    noteId: note.noteId,
    modelName: note.modelName,
    fields: Object.entries(note.fields)
      .sort(([, a], [, b]) => a.order - b.order)
      .map(([name, field]) => ({ name, value: field.value })),
    tags: [...note.tags],
    cardIds: [...note.cards],
  };
}

export function validateFieldNames(fields: Record<string, string>, available: string[]): void {
  for (const name of Object.keys(fields)) {
    if (!available.includes(name))
      throw new Error(`Unknown field "${name}". Available fields: ${available.join(', ')}.`);
  }
}

export async function mutationResult<T>(write: () => Promise<T>) {
  try {
    return { status: 'saved' as const, ...(await write()) };
  } catch (error) {
    if (
      !(error instanceof AnkiUncertainError) &&
      !(error instanceof AnkiError && error.action === 'updateNote')
    )
      throw error;
    return { status: 'uncertain' as const, action: error.action, message: error.message };
  }
}

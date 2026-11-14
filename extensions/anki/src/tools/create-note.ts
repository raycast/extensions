import { Tool } from '@raycast/api';
import { ankiReq } from '../api/ankiClient';
import noteActions from '../api/noteActions';
import {
  fieldsRecord,
  mutationResult,
  NoteFieldInput,
  validateFieldNames,
  validateTags,
} from './note-utils';

type Input = {
  /** Exact existing deck name from list-decks. */
  deckName: string;
  /** Exact note type name from list-note-types, including custom types. */
  modelName: string;
  /** Named field values. Use the exact names from list-note-types. HTML and Anki cloze markup are supported. */
  fields: NoteFieldInput[];
  /** Tags to assign. Each tag must have no spaces. Defaults to no tags. */
  tags?: string[];
};

async function prepare(input: Input) {
  const fields = fieldsRecord(input.fields);
  validateTags(input.tags);
  const [decks, models] = await Promise.all([
    ankiReq('deckNames'),
    ankiReq('findModelsByName', { modelNames: [input.modelName] }),
  ]);
  if (!decks.includes(input.deckName))
    throw new Error(`Deck "${input.deckName}" does not exist. Use list-decks or create-deck.`);
  const model = models.find(model => model.name === input.modelName);
  if (!model)
    throw new Error(`Note type "${input.modelName}" does not exist. Use list-note-types.`);
  const names = [...model.flds].sort((a, b) => a.ord - b.ord).map(field => field.name);
  validateFieldNames(fields, names);
  return {
    deckName: input.deckName,
    modelName: input.modelName,
    fields: Object.fromEntries(
      names.map(name => [
        name,
        Object.prototype.hasOwnProperty.call(fields, name) ? fields[name] : '',
      ])
    ),
    tags: input.tags ?? [],
    audio: [],
    video: [],
    picture: [],
  };
}

export const confirmation: Tool.Confirmation<Input> = async (input: Input) => {
  const note = await prepare(input);
  return {
    message: 'Create this note in Anki?',
    info: [
      { name: 'Deck', value: note.deckName },
      { name: 'Note Type', value: note.modelName },
      ...Object.entries(note.fields).map(([name, value]) => ({ name, value: value || '(empty)' })),
      { name: 'Tags', value: note.tags.join(', ') || '(none)' },
    ],
  };
};

export default async function tool(input: Input) {
  const note = await prepare(input);
  return mutationResult(async () => ({
    noteId: await noteActions.addNote(note),
    deckName: note.deckName,
    modelName: note.modelName,
  }));
}

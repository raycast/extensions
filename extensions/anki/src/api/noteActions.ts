import { AnkiError, AnkiUncertainError } from '../error/AnkiError';
import { getPreferenceValues } from '@raycast/api';
import { AddNoteParams, EditNoteParams, Note, UpdateNoteParams } from '../types';
import { delay } from '../util';
import { ankiReq } from './ankiClient';

export default {
  notesInfo: async (noteID: number): Promise<Note[] | undefined> => {
    return await ankiReq('notesInfo', {
      notes: [noteID],
    });
  },

  findNotes: async (query: string | undefined): Promise<Note[] | undefined> => {
    const defaultQuery = 'deck:_*';

    if (!query || query.trim().length == 0) {
      query = defaultQuery;
    }

    const noteIDs: number[] = await ankiReq('findNotes', {
      query: query,
    });
    await delay(2);
    const notesInfo: Note[] = await ankiReq('notesInfo', {
      notes: noteIDs,
    });
    return notesInfo;
  },
  addNote: async (params: AddNoteParams): Promise<number> => {
    const { allow_dup_cards, dup_scope } = getPreferenceValues<Preferences>();
    return await ankiReq('addNote', {
      note: {
        ...params,
        options: {
          allowDuplicate: allow_dup_cards ?? false,
          duplicateScope: dup_scope,
        },
      },
    });
  },
  deleteNote: async (cardID: number): Promise<void> => {
    const noteIds = await ankiReq('cardsToNotes', { cards: [cardID] });
    await ankiReq('deleteNotes', { notes: noteIds });
  },
  getTags: async (): Promise<string[] | undefined> => {
    const tags: string[] = await ankiReq('getTags');
    return tags;
  },
  updateNote: async (params: EditNoteParams): Promise<void> => {
    try {
      await ankiReq('updateNote', { note: params });
    } catch (error) {
      if (error instanceof AnkiError && !(error instanceof AnkiUncertainError)) {
        throw new AnkiError(
          `Anki could not finish updating this note. Some changes may have been saved. Check the note in Anki before retrying. ${error.message}`,
          'updateNote',
          error
        );
      }
      throw error;
    }
  },
  updateNoteFields: async (params: UpdateNoteParams): Promise<void> => {
    await ankiReq('updateNoteFields', { note: params });
  },
};

import { AxiosError } from 'axios';
import {
  AddNoteParams,
  Card,
  DeckName,
  DeckStats,
  EditNoteParams,
  Model,
  Note,
  UpdateNoteParams,
} from '../types';
import apiClient from './axios';
import { delay } from '../util';
import { AnkiError, AnkiUncertainError } from '../error/AnkiError';

const VERSION = 6;

export type AnkiActions = {
  addNote: {
    params: {
      note: AddNoteParams & { options: { allowDuplicate: boolean; duplicateScope: string } };
    };
    result: number;
  };
  answerCards: { params: { answers: { cardId: number; ease: number }[] }; result: boolean[] };
  areDue: { params: { cards: number[] }; result: boolean[] };
  cardsInfo: { params: { cards: number[] }; result: Card[] };
  cardsToNotes: { params: { cards: number[] }; result: number[] };
  createDeck: { params: { deck: string }; result: number };
  deckNames: { params: undefined; result: string[] };
  deckNamesAndIds: { params: undefined; result: DeckName };
  deleteDecks: { params: { decks: string[]; cardsToo: boolean }; result: null };
  deleteNotes: { params: { notes: number[] }; result: null };
  findCards: { params: { query: string }; result: number[] };
  findModelsByName: { params: { modelNames: string[] }; result: Model[] };
  findNotes: { params: { query: string }; result: number[] };
  getDeckStats: { params: { decks: string[] }; result: Record<string, DeckStats> };
  getMediaDirPath: { params: undefined; result: string };
  getTags: { params: undefined; result: string[] };
  guiBrowse: {
    params: {
      query: string;
      reorderCards?: { order: 'ascending' | 'descending'; columnId: string };
    };
    result: number[];
  };
  guiDeckReview: { params: { name: string }; result: boolean };
  guiSelectNote: { params: { note: number }; result: boolean };
  modelNames: { params: undefined; result: string[] };
  getCollectionStatsHTML: { params: { wholeCollection: boolean }; result: string };
  modelNamesAndIds: { params: undefined; result: Record<string, number> };
  notesInfo: { params: { notes: number[] }; result: Note[] };
  sync: { params: undefined; result: null };
  updateNoteFields: { params: { note: UpdateNoteParams }; result: null };
  updateNote: { params: { note: EditNoteParams }; result: null };
};

type AnkiAction = keyof AnkiActions;

interface AnkiResponse<T> {
  result: T;
  error: string | null;
}

const MAX_RETRIES = 5;
const INITIAL_DELAY = 1000;

const READ_ONLY_ACTIONS = new Set<AnkiAction>([
  'areDue',
  'cardsInfo',
  'cardsToNotes',
  'deckNames',
  'deckNamesAndIds',
  'findCards',
  'findModelsByName',
  'findNotes',
  'getDeckStats',
  'getMediaDirPath',
  'getTags',
  'modelNames',
  'getCollectionStatsHTML',
  'modelNamesAndIds',
  'notesInfo',
]);

export const ankiReq = async <A extends AnkiAction>(
  action: A,
  ...args: AnkiActions[A]['params'] extends undefined ? [] : [params: AnkiActions[A]['params']]
): Promise<AnkiActions[A]['result']> => {
  const params = args[0];
  console.info('Anki action:', action);
  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      const response = await apiClient.post<AnkiResponse<AnkiActions[A]['result']>>('', {
        action,
        version: VERSION,
        params: params || {},
      });

      const { result, error } = response.data;

      if (error) {
        throw new AnkiError(error, action);
      }

      return result;
    } catch (error) {
      if (
        error instanceof AxiosError &&
        ['ECONNRESET', 'ECONNABORTED', 'ETIMEDOUT'].includes(error.code || '') &&
        !READ_ONLY_ACTIONS.has(action)
      ) {
        throw new AnkiUncertainError(action, error);
      }

      if (
        error instanceof AxiosError &&
        error.code === 'ECONNRESET' &&
        READ_ONLY_ACTIONS.has(action)
      ) {
        retries++;
        if (retries >= MAX_RETRIES) {
          console.error(`Failed to perform Anki action: ${action} after ${MAX_RETRIES} attempts.`);
          throw error;
        }

        const delayTime = INITIAL_DELAY * Math.pow(2, retries - 1);

        console.warn(
          `Retrying Anki action: ${action}. Attempt ${retries} of ${MAX_RETRIES}. Waiting for ${delayTime}ms.`
        );

        await delay(delayTime);
        continue;
      }

      throw error;
    }
  }
  throw new Error(`Unexpected error in retry loop for action ${action}`);
};

import { AxiosError } from 'axios';
import apiClient from './axios';
import { delay } from '../util';
import { AnkiError } from '../error/AnkiError';

const VERSION = 6;

type AnkiAction =
  | 'addNote'
  | 'answerCards'
  | 'areDue'
  | 'cardsInfo'
  | 'cardsToNotes'
  | 'createDeck'
  | 'deckNames'
  | 'deckNamesAndIds'
  | 'deleteDecks'
  | 'deleteNotes'
  | 'findCards'
  | 'findModelsByName'
  | 'findNotes'
  | 'getDeckStats'
  | 'getMediaDirPath'
  | 'getTags'
  | 'guiBrowse'
  | 'guiSelectNote'
  | 'modelNames'
  | 'getCollectionStatsHTML'
  | 'modelNamesAndIds'
  | 'notesInfo'
  | 'sync'
  | 'updateNoteFields';

interface AnkiResponse<T> {
  result: T;
  error: string | null;
}

const MAX_RETRIES = 5;
const INITIAL_DELAY = 1; // 1 second

export const ankiReq = async <T>(
  action: AnkiAction,
  params?: Record<string, unknown>
): Promise<T> => {
  console.info('Anki action:', action);
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      const response = await apiClient.post<AnkiResponse<T>>('', {
        action,
        version: VERSION,
        params: params || {},
      });

      const { result, error } = response.data;

      if (error) {
        throw new AnkiError(`Error: ${error}`, action);
      }

      return result;
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.code === 'ECONNRESET') {
          retries++;
          if (retries >= MAX_RETRIES) {
            console.error(
              `Failed to perform Anki action: ${action} after ${MAX_RETRIES} attempts.`
            );
            throw error;
          }

          const delayTime = INITIAL_DELAY * Math.pow(2, retries - 1);
          console.log(
            `Retrying Anki action: ${action}. Attempt ${retries} of ${MAX_RETRIES}. Waiting for ${delayTime}ms.`
          );
          await delay(delayTime);
          continue;
        }

        if (error.code === 'ECONNREFUSED') {
          throw new Error('Ensure Anki is on and anki-connect port is set in extension settings');
        }
      }

      if (error instanceof AnkiError) {
        throw error;
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error(`An unknown error occurred while performing action ${action}`);
    }
  }

  // This line should never be reached, but TypeScript requires it
  throw new Error(`Unexpected error in retry loop for action ${action}`);
};

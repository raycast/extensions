import { ankiReq } from './ankiClient';
import { AnkiError } from '../error/AnkiError';

export default {
  guiDeckReview: async (deckName: string): Promise<void> => {
    const opened: boolean = await ankiReq('guiDeckReview', { name: deckName });
    if (opened !== true) {
      throw new AnkiError(`Anki could not open deck "${deckName}" for review.`, 'guiDeckReview');
    }
  },
  guiBrowse: async (query: string): Promise<void> => {
    await ankiReq('guiBrowse', {
      query: query,
      reorderCards: {
        order: 'descending',
        columnId: 'noteCrt',
      },
    });
  },
};

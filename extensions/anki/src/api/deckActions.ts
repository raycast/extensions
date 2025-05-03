import { DeckName, DeckStats } from '../types';
import { ankiReq } from './ankiClient';
import { combineDeckInfo, delay } from '../util';

export default {
  createDeck: async (deckName: string): Promise<void> => {
    try {
      await ankiReq('createDeck', { deck: deckName });
    } catch (error) {
      throw new Error('Could not create deck');
    }
  },

  deleteDeck: async (deckName: string): Promise<void> => {
    try {
      await ankiReq('deleteDecks', { decks: [deckName], cardsToo: true });
    } catch (error) {
      throw new Error(`Could not delete deck: ${deckName}`);
    }
  },

  getDecks: async (): Promise<DeckStats[]> => {
    const deckNames: DeckName = await ankiReq('deckNamesAndIds');
    await delay(1);
    const deckStats: { [key: string]: DeckStats } = await ankiReq('getDeckStats', {
      decks: deckNames,
    });
    return combineDeckInfo(deckStats, deckNames);
  },
};

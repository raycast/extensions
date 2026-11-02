import { DeckName, DeckStats } from '../types';
import { ankiReq } from './ankiClient';
import { combineDeckInfo, delay } from '../util';

export default {
  createDeck: async (deckName: string): Promise<number> => {
    return await ankiReq('createDeck', { deck: deckName });
  },

  deleteDeck: async (deckName: string): Promise<void> => {
    await ankiReq('deleteDecks', { decks: [deckName], cardsToo: true });
  },

  getDecks: async (): Promise<DeckStats[]> => {
    const deckNames: DeckName = await ankiReq('deckNamesAndIds');
    await delay(1);
    const deckStats: { [key: string]: DeckStats } = await ankiReq('getDeckStats', {
      decks: Object.keys(deckNames),
    });
    return combineDeckInfo(deckStats, deckNames);
  },
};

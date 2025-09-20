import { Card } from '../types';
import { ankiReq } from './ankiClient';
import { delay } from '../util';

export default {
  answerCard: async (cardID: number, ease: number): Promise<boolean | undefined> => {
    if (!cardID) return;

    const exists: [boolean] = await ankiReq('answerCards', {
      answers: [
        {
          cardId: cardID,
          ease: ease,
        },
      ],
    });

    if (!exists) {
      throw new Error(`Card with ID: [${cardID}] doesn't exist in this deck`);
    }

    return true;
  },

  areDue: async (cardIDs: number[] | undefined): Promise<boolean[] | undefined> => {
    if (!cardIDs) return;
    return await ankiReq('cardsInfo', {
      cards: cardIDs,
    });
  },

  cardInfo: async (cardID: number): Promise<Card[] | undefined> => {
    if (!cardID) return;
    return await ankiReq('cardsInfo', {
      cards: [cardID],
    });
  },

  cardsInfo: async (cardIDs: number[] | undefined | unknown): Promise<Card[] | undefined> => {
    if (!cardIDs) return;
    return await ankiReq('cardsInfo', {
      cards: cardIDs,
    });
  },

  cardsDueInfo: async (cardIDs: number[] | undefined): Promise<Card[] | undefined> => {
    if (!cardIDs) return;

    const cardsInfo: Card[] = await ankiReq('cardsInfo', {
      cards: cardIDs,
    });

    await delay(1);

    const cardsDue: boolean[] = await ankiReq('areDue', {
      cards: cardIDs,
    });

    return cardsInfo
      .filter((_, i) => cardsDue[i])
      .sort((a, b) => {
        // First, sort by queue type (review > learning > new)
        if (a.queue !== b.queue) {
          return b.queue - a.queue;
        }
        // For review cards, sort by due date
        if (a.queue === 2) {
          return a.due - b.due;
        }
        // For learning cards, they're already due so no additional sorting needed
        // For new cards, maintain their original order
        if (a.queue === 0) {
          return a.due - b.due;
        }
        return 0;
      });
  },

  findCards: async (deckName: string): Promise<number[] | undefined> => {
    const deckQuery = `"deck:${deckName}"`;
    const cards: number[] = await ankiReq('findCards', {
      query: deckQuery,
    });
    return cards;
  },

  findCardsInfo: async (query: string): Promise<Card[]> => {
    const defaultQuery = 'deck:_*';

    await delay(2);

    if (!query || !query.trim()) {
      query = defaultQuery;
    }

    const cardIDs: number[] = await ankiReq('findCards', {
      query: query,
    });

    await delay(2);

    const cardsInfo: Card[] = await ankiReq('cardsInfo', {
      cards: cardIDs,
    });

    return cardsInfo;
  },
};

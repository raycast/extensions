import { Card } from '../types';
import { AnkiError } from '../error/AnkiError';
import { ankiReq } from './ankiClient';
import { delay } from '../util';

export default {
  answerCard: async (cardID: number, ease: number): Promise<boolean | undefined> => {
    if (!cardID) return;

    const results: boolean[] = await ankiReq('answerCards', {
      answers: [
        {
          cardId: cardID,
          ease: ease,
        },
      ],
    });

    if (results[0] !== true) {
      throw new AnkiError(
        `Anki could not grade card ${cardID}. The card may no longer exist.`,
        'answerCards'
      );
    }

    return true;
  },

  areDue: async (cardIDs: number[] | undefined): Promise<boolean[] | undefined> => {
    if (!cardIDs) return;
    return await ankiReq('areDue', {
      cards: cardIDs,
    });
  },

  cardInfo: async (cardID: number): Promise<Card[] | undefined> => {
    if (!cardID) return;
    return await ankiReq('cardsInfo', {
      cards: [cardID],
    });
  },

  cardsInfo: async (cardIDs: number[] | undefined): Promise<Card[] | undefined> => {
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

    const now = Math.floor(Date.now() / 1000);
    const availableCards = cardsInfo.filter(
      card =>
        card.queue >= 0 &&
        // Learning and preview queues use timestamps; other queues use days or positions.
        ((card.queue !== 1 && card.queue !== 4) || card.due <= now)
    );
    if (availableCards.length === 0) return [];

    const cardsDue: boolean[] = await ankiReq('areDue', {
      cards: availableCards.map(card => card.cardId),
    });

    return availableCards
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

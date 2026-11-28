import { ankiReq } from '../api/ankiClient';

export function createCardPageLoader(pageSize = 40) {
  let snapshot: { query: string; ids: Promise<number[]> } | undefined;

  return (query: string) =>
    async ({ page }: { page: number }) => {
      const search = query.trim() || 'deck:_*';
      if (page === 0 || snapshot?.query !== search) {
        snapshot = { query: search, ids: ankiReq('findCards', { query: search }) };
      }
      const cardIds = await snapshot.ids;
      const start = page * pageSize;
      const end = start + pageSize;
      const cards = cardIds.slice(start, end);
      const details = cards.length ? await ankiReq('cardsInfo', { cards }) : [];
      return {
        data: details.filter(card => Number.isSafeInteger(card.cardId) && card.cardId > 0),
        hasMore: end < cardIds.length,
      };
    };
}

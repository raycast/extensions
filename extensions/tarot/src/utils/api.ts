/**
 * Get random cards
 * @param n number of cards to draw
 * @returns
 */
export const random = (n = 1) => {
  return `https://tarot-api-mu.vercel.app/api/cards/random?n=${n}`;
};

export const search = (query: string) => {
  return `https://tarot-api-mu.vercel.app/api/cards/search?q=${query}`;
};

export const URLS = {
  api: {
    graphql: "https://api.emojis.com/api/graphql",
  },
  emojis: {
    emoji: (slug: string) => `https://emojis.com/emoji/${slug}`,
  },
} as const;

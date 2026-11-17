/** Curated idle suggestions with stable App Store track IDs (US storefront). */
export const SUGGESTIONS = [
  { label: "Notion", trackId: 1232780281 },
  { label: "Figma", trackId: 1152747299 },
  { label: "Spotify", trackId: 324684580 },
  { label: "Linear", trackId: 1645587184 },
  { label: "Slack", trackId: 618783545 },
  { label: "Things", trackId: 904237743 },
] as const;

export type Suggestion = (typeof SUGGESTIONS)[number];

export function suggestionTrackIds(): number[] {
  return SUGGESTIONS.map((item) => item.trackId);
}

/** Map lookup results by trackId; ignore extras and never invent matches. */
export function indexByTrackId<T extends { trackId: number }>(apps: T[]): Map<number, T> {
  const map = new Map<number, T>();
  for (const app of apps) {
    map.set(app.trackId, app);
  }
  return map;
}

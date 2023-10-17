export type data = { id: string; title: string; body: string };
export type NoteData = { items: data[] };
export type CachePort = { cached: boolean; port: number };
export type CachePath = { cached: boolean; path: string };

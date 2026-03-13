export type NoteDetailData = { id: string; title: string; body: string };
export type NoteListData = { id: string; title: string };
export type NoteList = { items: NoteListData[] };
export type CachePort = { cached: boolean; port: number };
export type CachePath = { cached: boolean; path: string };

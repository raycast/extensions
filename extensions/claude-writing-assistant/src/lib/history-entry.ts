export interface HistoryEntry {
  id: string;
  createdAt: number;
  /** Command name from package.json, used for the filter and the icon. */
  command: string;
  title: string;
  input: string;
  output: string;
  model: string;
  cost: number;
}

const LIMIT = 300;
/** Texts are stored in full so "Paste Original" restores them exactly; old entries go first. */
const MAX_CHARS = 4_000_000;

/** Newest first: keeps at most LIMIT entries and MAX_CHARS of text, but always the newest. */
export function trimHistory(list: HistoryEntry[]): HistoryEntry[] {
  const kept: HistoryEntry[] = [];
  let size = 0;
  for (const entry of list.slice(0, LIMIT)) {
    size += entry.input.length + entry.output.length;
    if (kept.length > 0 && size > MAX_CHARS) break;
    kept.push(entry);
  }
  return kept;
}

import { RECENTLY_USED_LIMIT, updateRecentlyUsed } from "./recently-used";

export const RECENTS_KEY = "recently-used-ids-v1";
const LEGACY_KEY = "recently-used";
type Storage = {
  getItem(key: string): Promise<unknown>;
  setItem(key: string, value: string): Promise<unknown>;
};

function decode(raw: unknown, legacy = false): string[] {
  if (raw === undefined) return [];
  if (typeof raw !== "string") throw new Error("Recent emoji history could not be read");
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("Recent emoji history could not be read");
  const ids = parsed.map((item: unknown) =>
    legacy && typeof item === "object" && item !== null && "emoji" in item ? item.emoji : item,
  );
  if (!ids.every((id): id is string => typeof id === "string" && id.length > 0))
    throw new Error("Recent emoji history could not be read");
  return [...new Set(ids)].slice(0, RECENTLY_USED_LIMIT);
}

export class RecentEmojiStorage {
  private pending: Promise<unknown> = Promise.resolve();
  constructor(private readonly storage: Storage) {}

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.pending.then(operation);
    this.pending = next.catch(() => undefined);
    return next;
  }

  private async read(): Promise<string[]> {
    const current = await this.storage.getItem(RECENTS_KEY);
    if (current !== undefined) return decode(current);
    const legacy = await this.storage.getItem(LEGACY_KEY);
    const ids = decode(legacy, true);
    // Keep the original key intact as a migration backup.
    if (legacy !== undefined) await this.storage.setItem(RECENTS_KEY, JSON.stringify(ids));
    return ids;
  }

  load(): Promise<string[]> {
    return this.enqueue(() => this.read());
  }

  record(emoji: string): Promise<string[]> {
    return this.enqueue(async () => {
      const previous = await this.read();
      const next = updateRecentlyUsed(previous, emoji);
      await this.storage.setItem(RECENTS_KEY, JSON.stringify(next));
      return next;
    });
  }
}

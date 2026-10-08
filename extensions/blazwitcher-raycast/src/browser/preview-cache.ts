import type { BrowserEntry, Profile } from "../types";

type FileSource = "bookmark" | "history";
interface CacheStore {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): void;
  clear(): void;
}

export class StartupPreviewCache {
  constructor(
    private store: CacheStore,
    private now = Date.now,
  ) {}

  read(
    source: FileSource,
    profile: Profile,
    limit: number,
  ): BrowserEntry[] | undefined {
    try {
      const raw = this.store.get(`${profile.id}:${source}`);
      if (!raw) return;
      const value = JSON.parse(raw);
      const age = this.now() - value.savedAt;
      if (
        value.version !== 1 ||
        !Number.isFinite(age) ||
        age < 0 ||
        age > 5 * 60_000 ||
        !Array.isArray(value.entries) ||
        value.entries.length > 100
      )
        throw new Error("INVALID_PREVIEW");
      const entries = value.entries.map((row: unknown) =>
        restoreEntry(row, source, profile),
      );
      if (entries.some((row: BrowserEntry | undefined) => !row))
        throw new Error("INVALID_PREVIEW");
      return entries.slice(0, Math.min(100, limit));
    } catch {
      this.remove(source, profile);
      return;
    }
  }

  write(source: FileSource, profile: Profile, entries: BrowserEntry[]) {
    const rows = entries
      .filter(
        (row) =>
          row.source === source &&
          row.profile?.id === profile.id &&
          !row.incognito,
      )
      .slice(0, 100)
      .map(({ id, title, url, folder, visitedAt }) => ({
        id,
        title,
        url,
        folder,
        visitedAt,
      }));
    try {
      const raw = JSON.stringify({
        version: 1,
        savedAt: this.now(),
        entries: rows,
      });
      // 单个来源也有字节上限，异常长网址不挤占整个预览缓存。
      if (Buffer.byteLength(raw, "utf8") > 128 * 1024)
        this.remove(source, profile);
      else this.store.set(`${profile.id}:${source}`, raw);
    } catch {
      /* 缓存失败不影响实时数据。 */
    }
  }

  remove(source: FileSource, profile: Profile) {
    try {
      this.store.remove(`${profile.id}:${source}`);
    } catch {
      /* 缓存不可用时继续实时读取。 */
    }
  }

  clear() {
    try {
      this.store.clear();
      return true;
    } catch {
      return false;
    }
  }
}

function restoreEntry(
  value: unknown,
  source: FileSource,
  profile: Profile,
): BrowserEntry | undefined {
  if (!value || typeof value !== "object") return;
  const row = value as Partial<BrowserEntry>;
  if (
    typeof row.id !== "string" ||
    !row.id.startsWith(`${source}:${profile.id}:`) ||
    typeof row.title !== "string" ||
    typeof row.url !== "string"
  )
    return;
  if (
    source === "history" &&
    (typeof row.visitedAt !== "number" || !Number.isFinite(row.visitedAt))
  )
    return;
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    source,
    profile,
    folder: typeof row.folder === "string" ? row.folder : undefined,
    visitedAt: source === "history" ? row.visitedAt : undefined,
  };
}

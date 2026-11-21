import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import type { Hit, SearchResult } from "./backend.ts";

type Feedback = {
  query: string;
  correction?: string;
  file?: string;
  modified?: number;
  size?: number;
  relevant?: boolean;
};
export class SearchFeedback {
  private path: string;
  constructor(index: string) {
    this.path = join(index, "search-feedback.json");
  }
  private read(): Feedback[] {
    try {
      const value: unknown = JSON.parse(readFileSync(this.path, "utf8"));
      return Array.isArray(value)
        ? value
            .filter(
              (r): r is Feedback =>
                r &&
                typeof r.query === "string" &&
                r.query.length <= 512 &&
                (r.correction === undefined ||
                  (typeof r.correction === "string" &&
                    r.correction.length <= 512)) &&
                (r.file === undefined ||
                  (typeof r.file === "string" &&
                    r.file.startsWith("/") &&
                    !r.file.includes("\0"))) &&
                (r.relevant === undefined || typeof r.relevant === "boolean"),
            )
            .slice(-256)
        : [];
    } catch {
      return [];
    }
  }
  private save(entry: Feedback) {
    const rows = this.read().filter(
      (r) => !(r.query === entry.query && r.file === entry.file),
    );
    rows.push(entry);
    const folder = dirname(this.path);
    if (!existsSync(folder)) mkdirSync(folder, { recursive: true });
    writeFileSync(this.path + ".tmp", JSON.stringify(rows.slice(-256)), {
      mode: 0o600,
    });
    renameSync(this.path + ".tmp", this.path);
  }
  correct(query: string, correction: string) {
    this.save({ query, correction });
  }
  resolve(query: string) {
    const rows = this.read(),
      seen = new Set<string>();
    for (let i = 0; i < 8 && !seen.has(query); i++) {
      seen.add(query);
      const next = rows.findLast(
        (r) => r.query === query && r.correction,
      )?.correction;
      if (!next) break;
      query = next;
    }
    return query;
  }
  rate(query: string, hit: Hit, relevant: boolean) {
    this.save({
      query,
      file: hit.path,
      modified: hit.modified,
      size: hit.size,
      relevant,
    });
  }
  clear() {
    writeFileSync(this.path, "[]", { mode: 0o600 });
  }
  apply(query: string, result: SearchResult): SearchResult {
    const rows = this.read().filter((r) => r.query === query && r.file);
    const rating = (hit: Hit) => {
      const row = rows.findLast(
        (r) =>
          r.file === hit.path &&
          r.modified === hit.modified &&
          r.size === hit.size,
      );
      return row ? (row.relevant ? 1 : -1) : 0;
    };
    const positive = result.hits.filter((h) => rating(h) > 0),
      neutral = result.hits.filter((h) => rating(h) === 0),
      negative = result.hits.filter((h) => rating(h) < 0);
    const oldStrong = new Set(result.hits.slice(0, result.strong));
    return {
      ...result,
      hits: [
        ...positive,
        ...neutral.filter((h) => oldStrong.has(h)),
        ...neutral.filter((h) => !oldStrong.has(h)),
        ...negative,
      ],
      strong: positive.length + neutral.filter((h) => oldStrong.has(h)).length,
    };
  }
}

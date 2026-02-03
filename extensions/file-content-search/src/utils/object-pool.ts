import type { GrepEntry } from "../types";

const POOL_SIZE = 128;

/**
 * Object pool for GrepEntry to reduce GC pressure.
 * Reuses objects instead of creating new ones.
 */
export class GrepEntryPool {
  private pool: GrepEntry[] = [];
  private index = 0;

  acquire(id: number, path: string, line: number, offset: number, content: string): GrepEntry {
    if (this.index < this.pool.length) {
      const entry = this.pool[this.index++];
      entry.id = id;
      entry.path = path;
      entry.line = line;
      entry.offset = offset;
      entry.content = content;
      return entry;
    }

    if (this.pool.length < POOL_SIZE) {
      const entry: GrepEntry = { id, path, line, offset, content };
      this.pool.push(entry);
      this.index++;
      return entry;
    }

    return { id, path, line, offset, content };
  }

  reset(): void {
    this.index = 0;
  }

  clear(): void {
    this.pool = [];
    this.index = 0;
  }
}

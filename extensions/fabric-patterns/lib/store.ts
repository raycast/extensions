// Pins and run counts. Stored as one JSON string, since Raycast LocalStorage
// holds only primitives. The KV is injected so this stays bun-testable.

export interface KV {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
}

export interface Usage {
  /** Item ids in the order they were pinned. */
  pins: string[];
  counts: Record<string, number>;
}

const KEY = "usage.v1";

const empty = (): Usage => ({ pins: [], counts: {} });

// One queue for every store in the process: Search, Browse and each movePin hold their own
// UsageStore, and two changes that overlapped would each load the same snapshot, so the
// second write would drop the first (a quick ⌘. on two rows lost a pin).
let queue: Promise<unknown> = Promise.resolve();

/** Runs `fn` after every change already queued, by any store (lib/models.ts uses it too). */
export function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn);
  queue = run.catch(() => undefined);
  return run;
}

export class UsageStore {
  constructor(private kv: KV) {}

  /** A fresh copy of what storage holds now; corrupt JSON reads as empty. */
  async load(): Promise<Usage> {
    const raw = await this.kv.get(KEY);
    try {
      const u = raw ? (JSON.parse(raw) as Partial<Usage>) : {};
      return {
        pins: Array.isArray(u.pins) ? u.pins.filter((p) => typeof p === "string") : [],
        counts: u.counts && typeof u.counts === "object" ? { ...u.counts } : {},
      };
    } catch {
      return empty();
    }
  }

  // Every change is read-modify-write against storage, with no copy kept between calls:
  // Search, Browse and the editors each hold a store, and a stale copy would undo another's.
  private change(fn: (u: Usage) => Usage): Promise<Usage> {
    return serialize(async () => {
      const next = fn(await this.load());
      await this.kv.set(KEY, JSON.stringify(next));
      return next;
    });
  }

  togglePin(id: string): Promise<Usage> {
    return this.change((u) => ({
      ...u,
      pins: u.pins.includes(id) ? u.pins.filter((p) => p !== id) : [...u.pins, id],
    }));
  }

  recordRun(id: string): Promise<Usage> {
    return this.change((u) => ({ ...u, counts: { ...u.counts, [id]: (u.counts[id] ?? 0) + 1 } }));
  }

  /** A deleted item leaves no pin or count behind, so Search shows no "Pinned pattern is gone" row. */
  forget(id: string): Promise<Usage> {
    return this.change((u) => {
      const counts = { ...u.counts };
      delete counts[id];
      return { pins: u.pins.filter((p) => p !== id), counts };
    });
  }

  /** A renamed item keeps its pin (in place) and its run count. */
  rename(from: string, to: string): Promise<Usage> {
    return this.change((u) => {
      if (from === to) return u;
      const pins = u.pins.includes(to) ? u.pins.filter((p) => p !== from) : u.pins.map((p) => (p === from ? to : p));
      const { [from]: moved, ...counts } = u.counts;
      if (moved) counts[to] = (counts[to] ?? 0) + moved;
      return { pins, counts };
    });
  }
}

/** No-query order: pinned in pin order, then run count (desc), then A–Z. */
export function orderItems<T extends { id: string; name: string }>(
  items: T[],
  usage: Usage,
): { pinned: T[]; rest: T[]; used: T[]; unused: T[] } {
  const byId = new Map(items.map((i) => [i.id, i]));
  const pinned = usage.pins.map((id) => byId.get(id)).filter((i): i is T => i !== undefined);
  const pinnedIds = new Set(pinned.map((i) => i.id));
  const count = (i: T) => usage.counts[i.id] ?? 0;
  const rest = items
    .filter((i) => !pinnedIds.has(i.id))
    .sort((a, b) => count(b) - count(a) || a.name.localeCompare(b.name));
  // rest is count-desc then A–Z, so `used` leads by count and `unused` is A–Z.
  return { pinned, rest, used: rest.filter((i) => count(i) > 0), unused: rest.filter((i) => !count(i)) };
}

/** Pinned ids whose item no longer exists (a pattern update removed it). Empty until items have loaded. */
export function missingPins(items: { id: string }[], usage: Usage, prefix = "pattern:"): string[] {
  if (!items.length) return [];
  const have = new Set(items.map((i) => i.id));
  return usage.pins.filter((id) => id.startsWith(prefix) && !have.has(id));
}

import { Cache } from '@raycast/api';

const disk = new Cache({ namespace: 'adj-http' });
const MEM_CAP = 64;
const mem = new Map<string, { at: number; ttl: number; value: unknown }>();
const inflight = new Map<string, Promise<unknown>>();

type Recorded<T> = { at: number; ttl: number; value: T };

function persistable(key: string): boolean {
  return !key.includes('search=');
}

function evict() {
  while (mem.size > MEM_CAP) {
    const oldest = mem.keys().next().value;
    if (oldest == null) break;
    mem.delete(oldest);
  }
}

function read<T>(key: string): Recorded<T> | null {
  const live = mem.get(key);
  if (live) {
    if (Date.now() - live.at > live.ttl * 4) {
      mem.delete(key);
    } else {
      return live as Recorded<T>;
    }
  }
  const raw = disk.get(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Recorded<T>;
    if (!parsed || typeof parsed.at !== 'number') return null;
    mem.set(key, parsed);
    evict();
    return parsed;
  } catch {
    return null;
  }
}

function write<T>(key: string, value: T, ttl: number) {
  const rec: Recorded<T> = { at: Date.now(), ttl, value };
  mem.set(key, rec);
  evict();
  if (!persistable(key)) return;
  try {
    disk.set(key, JSON.stringify(rec));
  } catch {
    // cache quota
  }
}

export function peekCache<T>(key: string): T | undefined {
  return read<T>(key)?.value;
}

/** Fresh hit, else stale + background refresh, else network. Dedupes in-flight. */
export async function cached<T>(key: string, ttl: number, load: () => Promise<T>): Promise<T> {
  const hit = read<T>(key);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.value;

  const pending = inflight.get(key);
  if (pending) return (hit ? hit.value : pending) as T | Promise<T>;

  const job = load()
    .then((value) => {
      write(key, value, ttl);
      return value;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, job);

  if (hit) {
    void job.catch(() => undefined);
    return hit.value;
  }
  return job;
}

export async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  if (items.length === 0) return [];
  const out: PromiseSettledResult<R>[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      try {
        out[i] = { status: 'fulfilled', value: await fn(items[i]) };
      } catch (reason) {
        out[i] = { status: 'rejected', reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(Math.max(limit, 1), items.length) }, worker));
  return out;
}

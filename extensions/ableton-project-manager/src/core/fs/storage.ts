import { LocalStorage } from "@raycast/api";

/** 已存储的原始值是否“损坏”：存在，但无法 JSON 解析。undefined（从未存过）不算损坏。 */
export function isCorruptJson(raw: string | undefined): boolean {
  if (raw === undefined) return false;
  try {
    JSON.parse(raw);
    return false;
  } catch {
    return true;
  }
}

/** 存储中的数据存在但损坏、为避免覆盖而中止写入时抛出。 */
export class StorageUnreadableError extends Error {
  constructor() {
    super("Stored data is present but could not be read; the write was skipped to avoid overwriting it.");
    this.name = "StorageUnreadableError";
  }
}

/** 读取某个 key 的 JSON，并用 parse 校验成目标结构。从未存过或已损坏都返回 fallback()：损坏时只供展示，写入由 updateJson 拦截。 */
export async function readJson<T>(key: string, parse: (value: unknown) => T, fallback: () => T): Promise<T> {
  const raw = await LocalStorage.getItem<string>(key);
  if (!raw) return fallback();
  try {
    return parse(JSON.parse(raw));
  } catch {
    return fallback();
  }
}

// 每个 key 一条写入队列：同一 key 的更新排队，前一次写完才读下一次。
const writeQueues = new Map<string, Promise<unknown>>();

/** 对某个 key 做一次“读—改—写”。
 *  - 同一 key 的更新在本进程内排队执行，并发调用不会互相覆盖。
 *  - 数据存在但损坏时抛 StorageUnreadableError，绝不覆盖（原数据仍可能人工恢复）。
 *  - update 拿到的是刚读出的最新值，可以直接修改后返回；返回 null 表示无需写入。
 *  返回写入后的值（未写入则为读出的值）。 */
export function updateJson<T>(
  key: string,
  parse: (value: unknown) => T,
  fallback: () => T,
  update: (current: T) => T | null,
): Promise<T> {
  const run = async (): Promise<T> => {
    const raw = await LocalStorage.getItem<string>(key);
    if (isCorruptJson(raw)) throw new StorageUnreadableError();
    const current = raw ? parse(JSON.parse(raw)) : fallback();
    const next = update(current);
    if (next === null) return current;
    await LocalStorage.setItem(key, JSON.stringify(next));
    return next;
  };
  const result = (writeQueues.get(key) ?? Promise.resolve()).then(run);
  // 队列只关心“前一次结束了没有”，失败不往后传。
  writeQueues.set(
    key,
    result.catch(() => undefined),
  );
  return result;
}

/** 删除某个 key。和 updateJson 共用同一条队列：先发出的写入不会在删除之后把数据写回来。 */
export function removeJson(key: string): Promise<void> {
  const run = () => LocalStorage.removeItem(key);
  const result = (writeQueues.get(key) ?? Promise.resolve()).then(run);
  writeQueues.set(
    key,
    result.catch(() => undefined),
  );
  return result;
}

/** 预检：数据存在但损坏时抛 StorageUnreadableError。
 *  用于在做不可撤销的事（比如移动文件）之前，先确认之后的写入不会被拒。 */
export async function assertWritable(key: string): Promise<void> {
  if (isCorruptJson(await LocalStorage.getItem<string>(key))) throw new StorageUnreadableError();
}

/** 预检一组 key：以 prefix 开头的 key 里有损坏的就抛 StorageUnreadableError（按合集分 key 存的映射用）。 */
export async function assertPrefixWritable(prefix: string): Promise<void> {
  const all = await LocalStorage.allItems();
  for (const [key, value] of Object.entries(all)) {
    if (key.startsWith(prefix) && typeof value === "string" && isCorruptJson(value)) {
      throw new StorageUnreadableError();
    }
  }
}

/** LocalStorage 里以 prefix 开头的所有 key，去掉前缀后返回（按合集分 key 存的映射用）。 */
export async function listKeySuffixes(prefix: string): Promise<string[]> {
  const all = await LocalStorage.allItems();
  return Object.keys(all)
    .filter((key) => key.startsWith(prefix))
    .map((key) => key.slice(prefix.length));
}

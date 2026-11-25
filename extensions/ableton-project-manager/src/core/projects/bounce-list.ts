import { Cache } from "@raycast/api";
import type { Bounce, BounceWithSource } from "./bounces";
import type { Project } from "./types";

// 全部项目的 bounce 汇总列表：同一个文件只留一条，记下它属于哪些项目。
// 纯函数 + 缓存读写，不碰界面，方便测试。

export type BounceOwner = Pick<
  Project,
  "id" | "title" | "folderPath" | "externalBounceFolders" | "externalBounceFiles"
>;

export type BounceListItem = BounceWithSource & {
  /** 这个文件所属的项目，按出现顺序。共享文件夹里没对上项目的为空。 */
  owners: BounceOwner[];
  /** true = 共享文件夹里没归到任何项目的文件。 */
  unmatched: boolean;
};

/**
 * 合并各项目的 bounce 和未配对的文件。
 * - 只收 available 的 bounce（读不到的占位不进汇总列表）。
 * - 按 keyOf(path) 去重：同一个文件出现在多个项目里时只留一条，owners 列出全部所属项目，
 *   其余字段用第一次出现的那条。
 * - unmatched 追加在后面，标成 source:"shared"、unmatched:true、owners 为空；key 已出现过就跳过。
 * - 不排序，排序交给界面。
 */
export function mergeBounces(
  perProject: { owner: BounceOwner; bounces: BounceWithSource[] }[],
  unmatched: Bounce[],
  keyOf: (p: string) => string,
): BounceListItem[] {
  const byKey = new Map<string, BounceListItem>();

  for (const { owner, bounces } of perProject) {
    for (const bounce of bounces) {
      if (!bounce.available) continue;
      const key = keyOf(bounce.path);
      const existing = byKey.get(key);
      if (existing) {
        existing.owners.push(owner);
        continue;
      }
      byKey.set(key, { ...bounce, owners: [owner], unmatched: false });
    }
  }

  for (const bounce of unmatched) {
    const key = keyOf(bounce.path);
    if (byKey.has(key)) continue;
    byKey.set(key, { ...bounce, source: "shared", available: true, owners: [], unmatched: true });
  }

  return [...byKey.values()];
}

// ───────────────── 冷启动缓存 ─────────────────
// 和项目列表缓存一样：先显示上次读到的列表，扫描完再替换。

const CACHE_VERSION = 1;
const cache = new Cache({ namespace: "bounce-list-cache" });

type BounceListPayload = {
  version: number;
  items: BounceListItem[];
};

function cacheKey(projectsRoot: string): string {
  return `bounce-list-v1:${projectsRoot}`;
}

export function serializeBounceList(items: BounceListItem[]): string {
  const payload: BounceListPayload = { version: CACHE_VERSION, items };
  return JSON.stringify(payload);
}

/** 解析缓存内容。空、JSON 损坏、版本不对、items 不是数组都返回 undefined。 */
export function parseBounceList(raw: string | undefined): BounceListItem[] | undefined {
  if (!raw) return undefined;
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (typeof payload !== "object" || payload === null) return undefined;
  const { version, items } = payload as Partial<BounceListPayload>;
  if (version !== CACHE_VERSION) return undefined;
  if (!Array.isArray(items)) return undefined;
  return items as BounceListItem[];
}

export function readBounceListCache(projectsRoot: string): BounceListItem[] | undefined {
  return parseBounceList(cache.get(cacheKey(projectsRoot)));
}

/** 写缓存失败时静默忽略：缓存只是加速，不能影响列表显示。 */
export function writeBounceListCache(projectsRoot: string, items: BounceListItem[]): void {
  try {
    cache.set(cacheKey(projectsRoot), serializeBounceList(items));
  } catch {
    // 忽略
  }
}

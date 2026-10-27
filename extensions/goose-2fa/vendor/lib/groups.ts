import type { AccountData, VaultGroup } from "./types";

/** 一级「未分组」筛选键（不是真实 VaultGroup.id） */
export const UNGROUPED_KEY = "__ungrouped__";
export const MAX_GROUP_NAME_LENGTH = 20;

export function isUngrouped(account: AccountData): boolean {
  return !account.groupId;
}

export function filterByGroup(
  accounts: AccountData[],
  groupId: string | null,
): AccountData[] {
  if (groupId === null) return accounts;
  if (groupId === UNGROUPED_KEY) return accounts.filter(isUngrouped);
  return accounts.filter((a) => a.groupId === groupId);
}

export interface GroupTally {
  id: string;
  name: string;
  count: number;
  order: number;
}

/** 按 order 排列用户分组，并附带账户数。 */
export function buildGroupTallies(
  groups: VaultGroup[],
  accounts: AccountData[],
): GroupTally[] {
  const counts = new Map<string, number>();
  let ungrouped = 0;
  for (const account of accounts) {
    if (isUngrouped(account)) {
      ungrouped += 1;
      continue;
    }
    const id = account.groupId as string;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const sorted = [...groups].sort(
    (a, b) => a.order - b.order || a.name.localeCompare(b.name, "zh"),
  );

  const tallies: GroupTally[] = sorted.map((g) => ({
    id: g.id,
    name: g.name,
    count: counts.get(g.id) ?? 0,
    order: g.order,
  }));

  // 未分组始终可点，便于整理
  tallies.push({
    id: UNGROUPED_KEY,
    name: "未分组",
    count: ungrouped,
    order: Number.MAX_SAFE_INTEGER,
  });

  return tallies;
}

/**
 * 解析一级选中态。
 * - null → 全部
 * - UNGROUPED_KEY 始终合法
 * - 真实 group id 必须仍存在；accounts 空时不误清
 */
export function resolveSelectedGroup(
  selected: string | null,
  groups: VaultGroup[],
  accounts: AccountData[],
): string | null {
  if (selected === null) return null;
  if (selected === UNGROUPED_KEY) return UNGROUPED_KEY;
  if (groups.some((g) => g.id === selected)) return selected;
  // 分组列表尚未 hydrate 且 accounts 也空时保留，避免闪断
  if (groups.length === 0 && accounts.length === 0) return selected;
  return null;
}

export function nextGroupOrder(groups: VaultGroup[]): number {
  if (groups.length === 0) return 0;
  return Math.max(...groups.map((g) => g.order)) + 1;
}

export function normalizeGroupName(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, MAX_GROUP_NAME_LENGTH);
}

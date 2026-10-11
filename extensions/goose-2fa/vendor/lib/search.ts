import type { AccountData, VaultGroup } from "./types";

/**
 * 统一的账户匹配引擎：lowercase + 多关键字 AND。
 * 命中字段：issuer、name、remark、note、group。
 * 空查询返回 true（全量）。
 */
export function matchAccount(account: AccountData, query: string, groupName = ""): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [account.issuer, account.name, account.remark ?? "", account.note ?? "", groupName]
    .join(" ")
    .toLowerCase();
  return q
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

export function filterAccounts(accounts: AccountData[], query: string, groups: VaultGroup[] = []): AccountData[] {
  if (!query.trim()) return accounts;
  const names = new Map(groups.map((group) => [group.id, group.name]));
  return accounts.filter((account) => matchAccount(account, query, names.get(account.groupId ?? "") ?? ""));
}

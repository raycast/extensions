/**
 * uTools 与 Raycast 共享的保险柜语义：HOTP 计数器下限与回收站过期规则。
 * 两端读同一份数据源文件，这两条规则必须完全一致，否则一端会把另一端已消费的
 * HOTP 计数器写回旧值、或让「30 天后自动删除」在另一端失效。
 */
import type { AccountData } from "../lib/types";

export const TRASH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** 回收站只保留 30 天；本地库与数据源文件共用同一条规则。 */
export function pruneExpiredTrash(trash: AccountData[], now: number = Date.now()): AccountData[] {
  const cutoff = now - TRASH_MAX_AGE_MS;
  return trash.filter((account) => (account.deletedAt ?? 0) > cutoff);
}

/** HOTP 下限按密钥与算法参数匹配，普通导入换 id 也不会绕过回退保护。 */
export function hotpIdentity(account: AccountData): string {
  return [account.algorithm, account.digits, account.type, account.secret].join("|");
}

/**
 * 合并两边的 HOTP 计数器，只增不减：incoming 里低于 current 的计数器被抬回高水位。
 * raised=true 表示内存与磁盘不一致，调用方需要回写纠正值。
 */
export function keepHotpFloor(
  incoming: AccountData[],
  current: AccountData[],
): { accounts: AccountData[]; raised: boolean } {
  const floor = new Map<string, number>();
  for (const account of current) {
    if (account.type === "hotp") floor.set(hotpIdentity(account), account.counter);
  }
  let raised = false;
  const accounts = incoming.map((account) => {
    if (account.type !== "hotp") return account;
    const lowest = floor.get(hotpIdentity(account));
    if (lowest === undefined || lowest <= account.counter) return account;
    raised = true;
    return { ...account, counter: lowest };
  });
  return { accounts, raised };
}

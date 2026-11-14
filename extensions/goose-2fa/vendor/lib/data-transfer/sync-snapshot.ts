import { normalizeStoredAccounts } from "../account-validation";
import type { AccountData, VaultGroup } from "../types";
import { normalizeGroups } from "./normalization";

export interface SyncExportPayload {
  version: 2;
  app: "goose-2fa";
  exported_at: string;
  groups: VaultGroup[];
  accounts: AccountData[];
  trash: AccountData[];
}

/** 自动同步备份保留稳定 id、时间戳和回收站，仍可被手动导入读取。 */
export function exportAsSyncJson(
  accounts: AccountData[],
  groups: VaultGroup[] = [],
  trash: AccountData[] = [],
): string {
  const payload: SyncExportPayload = {
    version: 2,
    app: "goose-2fa",
    exported_at: new Date().toISOString(),
    groups: groups.map((group) => ({ ...group })),
    accounts: accounts.map((account) => ({ ...account })),
    trash: trash.map((account) => ({ ...account })),
  };
  return JSON.stringify(payload, null, 2);
}

export interface SyncSnapshot {
  accounts: AccountData[];
  groups: VaultGroup[];
  trash: AccountData[];
}

export function hasStableId(item: unknown): boolean {
  if (!item || typeof item !== "object") return false;
  const id = (item as Record<string, unknown>).id;
  return typeof id === "string" && id !== "";
}

/**
 * 严格解析自动同步文件（数据源）：保留 id/createdAt/deletedAt 与回收站。
 * 头部不符、任一条目缺少稳定 id 或无法解析时返回 null —— 调用方必须按「文件无效」处理，
 * 不能当成空库，也不能把解析结果写回文件。
 */
export function parseSyncSnapshot(text: string): SyncSnapshot | null {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return null;
  }
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const raw = json as Record<string, unknown>;
  if (raw.app !== "goose-2fa" || !Array.isArray(raw.accounts)) return null;
  const accountsRaw = raw.accounts as unknown[];
  const trashRaw = Array.isArray(raw.trash) ? (raw.trash as unknown[]) : [];
  if (!accountsRaw.every(hasStableId) || !trashRaw.every(hasStableId)) return null;
  // id 同时是界面 key 与更新/删除主键，重复 id 会让一次编辑命中多条记录。
  const ids = [...accountsRaw, ...trashRaw].map((item) => (item as { id: string }).id);
  if (new Set(ids).size !== ids.length) return null;
  const groups = normalizeGroups(raw.groups);
  const validGroupIds = new Set(groups.map((group) => group.id));
  const accounts = normalizeStoredAccounts(accountsRaw, validGroupIds);
  const trash = normalizeStoredAccounts(trashRaw, validGroupIds);
  if (accounts.length !== accountsRaw.length || trash.length !== trashRaw.length) return null;
  return { accounts, groups, trash };
}

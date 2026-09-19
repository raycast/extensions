import { LocalStorage } from "@raycast/api";
import type { SyncSnapshot } from "../../vendor/lib/data-transfer";
import { snapshotFromLocal } from "./vault-ops";

// 未配置数据源文件时使用的 Raycast 本地库（加密 LocalStorage），键名与 uTools 端一致。
const KEYS = {
  accounts: "goose-2fa-accounts",
  groups: "goose-2fa-groups",
  trash: "goose-2fa-trash",
} as const;

export type LocalVaultRead =
  | { status: "ok"; snapshot: SyncSnapshot }
  | { status: "broken"; keys: string[] };

/** 读本地库。坏值不当成空库：原值原样保留，由用户显式重建或改用数据源文件。 */
export async function readLocalVault(): Promise<LocalVaultRead> {
  const broken: string[] = [];
  const values: { accounts: unknown; groups: unknown; trash: unknown } = { accounts: [], groups: [], trash: [] };
  for (const field of ["accounts", "groups", "trash"] as const) {
    const key = KEYS[field];
    const raw = await LocalStorage.getItem<string>(key);
    if (raw === undefined || raw === "") {
      values[field] = [];
      continue;
    }
    try {
      values[field] = JSON.parse(raw) as unknown;
    } catch {
      broken.push(key);
    }
  }
  if (broken.length > 0) return { status: "broken", keys: broken };
  return { status: "ok", snapshot: snapshotFromLocal(values) };
}

export async function writeLocalVault(snapshot: SyncSnapshot): Promise<void> {
  await Promise.all([
    LocalStorage.setItem(KEYS.accounts, JSON.stringify(snapshot.accounts)),
    LocalStorage.setItem(KEYS.groups, JSON.stringify(snapshot.groups)),
    LocalStorage.setItem(KEYS.trash, JSON.stringify(snapshot.trash)),
  ]);
}

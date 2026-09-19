import {
  deduplicateImports,
  exportAsSyncJson,
  parseImportBundle,
  type SyncSnapshot,
} from "../../../src/lib/data-transfer";
import { normalizeStoredAccounts } from "../../../src/lib/account-validation";
import { nextGroupOrder, normalizeGroupName } from "../../../src/lib/groups";
import type { AccountData, NewAccountInput, VaultGroup } from "../../../src/lib/types";
import { keepHotpFloor, pruneExpiredTrash } from "../../../shared/vault-ops";

export function normalizeGroups(value: unknown): VaultGroup[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const groups: VaultGroup[] = [];
  for (const [index, item] of value.entries()) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Record<string, unknown>;
    const id = typeof raw.id === "string" ? raw.id.trim() : "";
    const name = typeof raw.name === "string" ? normalizeGroupName(raw.name) : "";
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    groups.push({
      id,
      name,
      order: Number.isFinite(raw.order) ? Number(raw.order) : index,
      createdAt: Number.isFinite(raw.createdAt) ? Number(raw.createdAt) : Date.now() + index,
    });
  }
  return groups;
}

/** 从外部快照进入内存：HOTP 只增不减，回收站按 30 天规则清理，需要时回写纠正值。 */
export function mergeExternalSnapshot(
  incoming: SyncSnapshot,
  current: AccountData[],
): { snapshot: SyncSnapshot; corrected: boolean } {
  const { accounts, raised } = keepHotpFloor(incoming.accounts, current);
  const trash = pruneExpiredTrash(incoming.trash);
  return {
    snapshot: { accounts, groups: incoming.groups, trash },
    corrected: raised || trash.length !== incoming.trash.length,
  };
}

export function snapshotFromLocal(raw: { accounts: unknown; groups: unknown; trash: unknown }): SyncSnapshot {
  const groups = normalizeGroups(raw.groups);
  const validGroupIds = new Set(groups.map((group) => group.id));
  return {
    accounts: normalizeStoredAccounts(raw.accounts, validGroupIds),
    groups,
    trash: pruneExpiredTrash(normalizeStoredAccounts(raw.trash, validGroupIds)),
  };
}

export function createAccount(
  input: NewAccountInput,
  groups: VaultGroup[],
  groupId: string | null,
): AccountData {
  return {
    ...input,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    groupId: groupId && groups.some((group) => group.id === groupId) ? groupId : null,
  };
}

export function buildGroup(name: string, groups: VaultGroup[]): VaultGroup | null {
  const normalized = normalizeGroupName(name);
  if (!normalized) return null;
  return {
    id: crypto.randomUUID(),
    name: normalized,
    order: nextGroupOrder(groups),
    createdAt: Date.now(),
  };
}

/** 预览/执行导入 otpauth URI、Google 迁移码或 goose-2fa JSON 备份；重复账户只统计不写入。 */
export function previewImport(
  text: string,
  current: SyncSnapshot,
): { snapshot: SyncSnapshot; added: number; dupeCount: number } | null {
  const bundle = parseImportBundle(text);
  if (!bundle) return null;
  const groups = [...current.groups];
  for (const group of bundle.groups) {
    if (!groups.some((candidate) => candidate.id === group.id)) groups.push(group);
  }
  const { newAccounts, dupeCount } = deduplicateImports(bundle.accounts, current.accounts);
  const created = newAccounts.map((input) => createAccount(input, groups, input.groupId ?? null));
  return {
    snapshot: { accounts: [...current.accounts, ...created], groups, trash: current.trash },
    added: created.length,
    dupeCount,
  };
}

export function toBackupJson(snapshot: SyncSnapshot): string {
  return exportAsSyncJson(snapshot.accounts, snapshot.groups, snapshot.trash);
}

export function upsertAccount(
  accounts: AccountData[],
  id: string,
  patch: Partial<AccountData>,
): AccountData[] {
  return accounts.map((account) => (account.id === id ? { ...account, ...patch } : account));
}

// ---- 纯变换：命令层只负责把它们交给 updateVault ----

export function moveToTrash(snapshot: SyncSnapshot, id: string): SyncSnapshot {
  const account = snapshot.accounts.find((candidate) => candidate.id === id);
  if (!account) return snapshot;
  return {
    accounts: snapshot.accounts.filter((candidate) => candidate.id !== id),
    groups: snapshot.groups,
    trash: [{ ...account, deletedAt: Date.now() }, ...snapshot.trash.filter((candidate) => candidate.id !== id)],
  };
}

export function restoreFromTrash(snapshot: SyncSnapshot, id: string): SyncSnapshot {
  const account = snapshot.trash.find((candidate) => candidate.id === id);
  if (!account) return snapshot;
  const { deletedAt: _deletedAt, ...restored } = account;
  return {
    accounts: [...snapshot.accounts, restored as AccountData],
    groups: snapshot.groups,
    trash: snapshot.trash.filter((candidate) => candidate.id !== id),
  };
}

export function deleteForever(snapshot: SyncSnapshot, id: string): SyncSnapshot {
  return { ...snapshot, trash: snapshot.trash.filter((candidate) => candidate.id !== id) };
}

export function emptyTrash(snapshot: SyncSnapshot): SyncSnapshot {
  return { ...snapshot, trash: [] };
}

export function setAccountGroup(snapshot: SyncSnapshot, id: string, groupId: string | null): SyncSnapshot {
  const valid = groupId && snapshot.groups.some((group) => group.id === groupId) ? groupId : null;
  return { ...snapshot, accounts: upsertAccount(snapshot.accounts, id, { groupId: valid }) };
}

export function setAccountText(
  snapshot: SyncSnapshot,
  id: string,
  patch: Pick<Partial<AccountData>, "name" | "issuer" | "note" | "remark">,
): SyncSnapshot {
  return { ...snapshot, accounts: upsertAccount(snapshot.accounts, id, patch) };
}

export function addGroup(snapshot: SyncSnapshot, name: string): { snapshot: SyncSnapshot; group: VaultGroup | null } {
  const group = buildGroup(name, snapshot.groups);
  if (!group) return { snapshot, group: null };
  return { snapshot: { ...snapshot, groups: [...snapshot.groups, group] }, group };
}

export function renameGroup(snapshot: SyncSnapshot, id: string, name: string): SyncSnapshot {
  const normalized = normalizeGroupName(name);
  if (!normalized) return snapshot;
  return {
    ...snapshot,
    groups: snapshot.groups.map((group) => (group.id === id ? { ...group, name: normalized } : group)),
  };
}

/** 删除分组：组内账户回到未分组，不连带删除账户。 */
export function removeGroup(snapshot: SyncSnapshot, id: string): SyncSnapshot {
  return {
    accounts: snapshot.accounts.map((account) => (account.groupId === id ? { ...account, groupId: null } : account)),
    groups: snapshot.groups.filter((group) => group.id !== id),
    trash: snapshot.trash,
  };
}

export function addAccounts(snapshot: SyncSnapshot, inputs: NewAccountInput[], groupId: string | null): SyncSnapshot {
  const created = inputs.map((input) => createAccount(input, snapshot.groups, groupId));
  return { ...snapshot, accounts: [...snapshot.accounts, ...created] };
}

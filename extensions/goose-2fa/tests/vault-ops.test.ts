import { describe, expect, test } from "bun:test";
import { exportAsSyncJson } from "../vendor/lib/data-transfer";
import type { AccountData, NewAccountInput } from "../vendor/lib/types";
import {
  addGroup,
  emptyTrash,
  mergeExternalSnapshot,
  moveToTrash,
  previewImport,
  removeGroup,
  renameGroup,
  restoreFromTrash,
  setAccountGroup,
  snapshotFromLocal,
} from "../src/lib/vault-ops";

const base: NewAccountInput = {
  name: "alice@example.com",
  issuer: "GitHub",
  secret: "JBSWY3DPEHPK3PXP",
  type: "totp",
  digits: 6,
  period: 30,
  counter: 0,
  algorithm: "SHA-1",
};

function account(id: string, overrides: Partial<AccountData> = {}): AccountData {
  return { ...base, id, createdAt: 1, ...overrides };
}

describe("保险柜语义（与 uTools 端共用 ）", () => {
  test("载入外部快照时 HOTP 计数器只增不减", () => {
    const current = [account("h1", { type: "hotp", counter: 9 })];
    const incoming = { accounts: [account("h1", { type: "hotp", counter: 2 })], groups: [], trash: [] };
    const merged = mergeExternalSnapshot(incoming, current);
    expect(merged.snapshot.accounts[0]?.counter).toBe(9);
    expect(merged.corrected).toBe(true);
  });

  test("过期回收站条目在载入时清理", () => {
    const expired = account("t1", { deletedAt: Date.now() - 31 * 24 * 60 * 60 * 1000 });
    const fresh = account("t2", { deletedAt: Date.now() });
    const merged = mergeExternalSnapshot({ accounts: [], groups: [], trash: [expired, fresh] }, []);
    expect(merged.snapshot.trash.map((item) => item.id)).toEqual(["t2"]);
    expect(merged.corrected).toBe(true);
  });

  test("回收站往返与清空", () => {
    const snapshot = exportAsSyncSnapshot([account("a1")]);
    const trashed = moveToTrash(snapshot, "a1");
    expect(trashed.accounts).toHaveLength(0);
    expect(trashed.trash[0]?.id).toBe("a1");
    expect(typeof trashed.trash[0]?.deletedAt).toBe("number");

    const restored = restoreFromTrash(trashed, "a1");
    expect(restored.accounts[0]?.id).toBe("a1");
    expect(restored.accounts[0]?.deletedAt).toBeUndefined();
    expect(emptyTrash(restored).trash).toEqual([]);
  });

  test("分组增删改：删除分组只解绑账户", () => {
    const withGroup = addGroup(exportAsSyncSnapshot([account("a1")]), "工作");
    expect(withGroup.group).not.toBeNull();
    const groupId = withGroup.group?.id ?? "";
    const assigned = setAccountGroup(withGroup.snapshot, "a1", groupId);
    expect(assigned.accounts[0]?.groupId).toBe(groupId);

    const renamed = renameGroup(assigned, groupId, "  工作   账号  ");
    expect(renamed.groups[0]?.name).toBe("工作 账号");

    const removed = removeGroup(renamed, groupId);
    expect(removed.groups).toEqual([]);
    expect(removed.accounts[0]?.groupId).toBeNull();
  });

  test("未知分组不会被写进账户", () => {
    const snapshot = setAccountGroup(exportAsSyncSnapshot([account("a1")]), "a1", "missing");
    expect(snapshot.accounts[0]?.groupId).toBeNull();
  });

  test("导入 otpauth URI 并跳过重复账户", () => {
    const snapshot = exportAsSyncSnapshot([]);
    const uri = "otpauth://totp/GitHub:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=GitHub";
    const first = previewImport(uri, snapshot);
    expect(first?.added).toBe(1);
    expect(first?.dupeCount).toBe(0);
    expect(first?.snapshot.accounts).toHaveLength(1);
    expect(first?.snapshot.accounts[0]?.id).toBeTruthy();

    const again = previewImport(uri, first?.snapshot ?? snapshot);
    expect(again?.added).toBe(0);
    expect(again?.dupeCount).toBe(1);

    expect(previewImport("这不是可解析的内容", snapshot)).toBeNull();
  });

  test("本地库快照解析保留 id/createdAt 并按 30 天清理回收站", () => {
    const snapshot = snapshotFromLocal({
      accounts: [account("a1", { note: "工作" })],
      groups: [{ id: "g1", name: "工作", order: 0, createdAt: 5 }],
      trash: [account("t1", { deletedAt: 1 })],
    });
    expect(snapshot.accounts[0]).toMatchObject({ id: "a1", createdAt: 1, note: "工作" });
    expect(snapshot.groups[0]?.id).toBe("g1");
    expect(snapshot.trash).toEqual([]);
  });
});

function exportAsSyncSnapshot(accounts: AccountData[]) {
  return { accounts, groups: [], trash: [] };
}

test("导出的备份可以被自己解析（格式闭环）", () => {
  const text = exportAsSyncJson([account("a1")], [], [account("t1", { deletedAt: Date.now() })]);
  const parsed = JSON.parse(text) as { app: string; accounts: unknown[]; trash: unknown[] };
  expect(parsed.app).toBe("goose-2fa");
  expect(parsed.accounts).toHaveLength(1);
  expect(parsed.trash).toHaveLength(1);
});

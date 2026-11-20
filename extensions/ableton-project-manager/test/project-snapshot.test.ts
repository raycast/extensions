import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { diffSnapshots, isConfirmedInTrash, readTrashFolders } from "../src/core/fs/project-snapshot";

const e = (id: string, birthtimeMs: number, inode?: number) => ({ id, birthtimeMs, inode });

describe("diffSnapshots", () => {
  it("同一文件夹（创建时间 + inode）换了名字识别为改名", () => {
    const diff = diffSnapshots([e("Old", 1, 10), e("Keep", 2, 20)], [e("New", 1, 10), e("Keep", 2, 20)]);
    expect(diff.renamed).toEqual([{ from: e("Old", 1, 10), to: e("New", 1, 10) }]);
    expect(diff.removed).toEqual([]);
  });

  it("复制后删除原件：创建时间相同但 inode 不同，不算改名", () => {
    const diff = diffSnapshots([e("Song", 1, 10)], [e("Song copy", 1, 11)]);
    expect(diff.renamed).toEqual([]);
    expect(diff.removed).toEqual([e("Song", 1, 10)]);
  });

  it("旧快照没有 inode：创建时间相同也不判为改名，当作歧义跳过", () => {
    const diff = diffSnapshots([e("Song", 1)], [e("Song copy", 1, 11)]);
    expect(diff.renamed).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.ambiguous).toEqual([e("Song", 1)]);
  });

  it("一个消失项对应多个候选时判为歧义，不自动处理", () => {
    const diff = diffSnapshots([e("A", 1)], [e("X", 1), e("Y", 1)]);
    expect(diff.renamed).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.ambiguous).toEqual([e("A", 1)]);
  });

  it("一个新文件夹被多个消失项认领时判为歧义", () => {
    const diff = diffSnapshots([e("A", 1), e("B", 1)], [e("C", 1)]);
    expect(diff.renamed).toEqual([]);
    expect(diff.ambiguous).toEqual([e("A", 1), e("B", 1)]);
  });

  it("消失且无对应识别为移除；同名新项目不算改名", () => {
    const diff = diffSnapshots([e("A", 1), e("B", 2), e("C", 3)], [e("A", 1), e("B", 2), e("D", 9)]);
    expect(diff.removed).toEqual([e("C", 3)]);
    expect(diff.renamed).toEqual([]);
  });

  it("一次消失过半（且多于 3 个）时触发保护，不报移除", () => {
    const previous = [1, 2, 3, 4, 5, 6].map((n) => e(`P${n}`, n));
    const diff = diffSnapshots(previous, [e("P6", 6)]);
    expect(diff.guardTripped).toBe(true);
    expect(diff.removed).toEqual([]);
  });

  it("项目全部消失（如外接盘未挂载）时触发保护", () => {
    const diff = diffSnapshots([e("A", 1), e("B", 2)], []);
    expect(diff.guardTripped).toBe(true);
    expect(diff.removed).toEqual([]);
  });
});

describe("readTrashFolders", () => {
  it("读出废纸篓里文件夹的创建时间与 inode；不存在的废纸篓视为空", () => {
    const trash = fs.mkdtempSync(path.join(os.tmpdir(), "asm-trash-"));
    const folder = path.join(trash, "Song 21.30.12");
    fs.mkdirSync(folder);
    const stats = fs.statSync(folder);

    const folders = readTrashFolders([trash, path.join(trash, "no-such-volume-trash")]);
    expect(folders?.some((f) => f.inode === stats.ino && f.birthtimeMs === stats.birthtimeMs)).toBe(true);

    fs.rmSync(trash, { recursive: true, force: true });
  });

  it("~/.Trash 读不了（无权限）时返回 null", () => {
    const locked = fs.mkdtempSync(path.join(os.tmpdir(), "asm-locked-"));
    fs.chmodSync(locked, 0o000);
    try {
      expect(readTrashFolders([locked])).toBeNull();
    } finally {
      fs.chmodSync(locked, 0o700);
      fs.rmSync(locked, { recursive: true, force: true });
    }
  });
});

describe("isConfirmedInTrash", () => {
  const f = (birthtimeMs: number, inode?: number) => ({ birthtimeMs, inode });

  it("读不到废纸篓（null）时一律不确认", () => {
    expect(isConfirmedInTrash(f(1, 10), null)).toBe(false);
  });

  it("能读到废纸篓且 inode 一致才确认；inode 不一致不确认", () => {
    expect(isConfirmedInTrash(f(1, 10), [f(1, 10)])).toBe(true);
    expect(isConfirmedInTrash(f(1, 10), [f(1, 99)])).toBe(false);
  });

  it("旧快照缺 inode：即使废纸篓里有同创建时间的文件夹也不确认（避免误归档）", () => {
    expect(isConfirmedInTrash(f(1), [f(1, 10)])).toBe(false);
  });
});

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { removedProjectIds } from "../src/core/fs/removed-projects";

let root: string;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "asm-removed-"));
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe("removedProjectIds", () => {
  it("文件夹还在但没有 .als 也不算已移除（只看文件夹是否存在）", () => {
    fs.mkdirSync(path.join(root, "Song A")); // 空文件夹，没有 .als
    fs.mkdirSync(path.join(root, "Song B"));
    fs.writeFileSync(path.join(root, "Song B", "b.als"), "x");

    // 两个项目都还在磁盘上 → 一个都不该判为已移除。
    expect(removedProjectIds(root, ["Song A", "Song B"])).toEqual([]);
  });

  it("元数据里有、但根目录中已找不到对应文件夹的，判为已移除并排序", () => {
    fs.mkdirSync(path.join(root, "Kept"));
    expect(removedProjectIds(root, ["Kept", "Gone", "Also Gone"])).toEqual(["Also Gone", "Gone"]);
  });

  it("根目录读不到时返回 null（不确定，不应清理）", () => {
    expect(removedProjectIds(path.join(root, "no-such-dir"), ["Song A"])).toBeNull();
  });
});

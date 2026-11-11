import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { LocalStorage } from "@raycast/api";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { archiveDeletedProject, assertDeletionWritable, restorePutBackProjects } from "../src/core/fs/deleted-projects";
import { StorageUnreadableError } from "../src/core/fs/storage";
import { deleteProjectMetadata, getProjectMetadata, saveProjectMetadata } from "../src/core/metadata/project-metadata";
import { getTrackMap, removeProjectFromAllOrders, setTrackMap } from "../src/core/metadata/collection-order";
import type { Project } from "../src/core/projects/types";
import { __setPreferences, environment } from "./mocks/raycast-api";

// 只需要"现有合集"列表；避免加载真实的 taxonomies（可能用到 Raycast 运行时对象）。
vi.mock("../src/core/metadata/taxonomies", () => ({
  collectionTaxonomy: { get: async () => [{ id: "ep", name: "EP" }] },
}));

let notes: string;

function makeProject(id: string, createdAt = 1000, inode = 42): Project {
  return {
    id,
    title: id,
    folderPath: `/p/${id}`,
    createdAt,
    inode,
    modifiedAt: 0,
    stageId: null,
    genreIds: [],
    collectionIds: [],
    notes: "",
    lyrics: "",
    pinned: false,
    pinOrder: null,
    setsCount: 1,
    bouncesCount: 0,
    externalBounceFolders: [],
    externalBounceFiles: [],
  };
}

const metadata = {
  stageId: "mix",
  genreIds: [],
  collectionIds: ["ep"],
  pinned: false,
  pinOrder: null,
  notes: "",
  externalBounceFolders: [],
  externalBounceFiles: [],
};

beforeEach(async () => {
  await LocalStorage.clear();
  notes = fs.mkdtempSync(path.join(os.tmpdir(), "asm-notes-"));
  environment.supportPath = fs.mkdtempSync(path.join(os.tmpdir(), "asm-support-"));
  __setPreferences({ notesFolder: notes });
});

afterEach(() => {
  __setPreferences({});
  fs.rmSync(notes, { recursive: true, force: true });
  fs.rmSync(`${notes}-unplugged`, { recursive: true, force: true });
});

describe("删除 → 放回 → 重试", () => {
  it("放回后还原数据；文档文件夹不可用时保留待还原文档，恢复可用后补上", async () => {
    const song = makeProject("Song");
    await saveProjectMetadata("Song", metadata);
    await setTrackMap("ep", { Song: 3 });
    fs.writeFileSync(path.join(notes, "Song.md"), "mine");

    // 删除：存档 + 清理（与 Move to Trash 流程一致）
    await archiveDeletedProject(song);
    await deleteProjectMetadata("Song");
    await removeProjectFromAllOrders("Song");
    expect(fs.existsSync(path.join(notes, "Song.md"))).toBe(false);

    // 放回时笔记文件夹暂时不可用：数据照常还原
    fs.renameSync(notes, `${notes}-unplugged`);
    const first = await restorePutBackProjects([song]);
    expect(first.restored).toEqual(["Song"]);
    expect((await getProjectMetadata("Song")).stageId).toBe("mix");
    expect(await getTrackMap("ep")).toEqual({ Song: 3 });

    // 文件夹回来后再次加载：只补还原文档，不重复提示
    fs.renameSync(`${notes}-unplugged`, notes);
    const second = await restorePutBackProjects([song]);
    expect(second.restored).toEqual([]);
    expect(fs.readFileSync(path.join(notes, "Song.md"), "utf8")).toBe("mine");

    // 全部还原后记录被清掉
    expect(JSON.parse((await LocalStorage.getItem<string>("deleted-projects")) ?? "[]")).toEqual([]);
  });

  it("删除记录损坏：直接报错，笔记留在原处，记录不被覆盖", async () => {
    await LocalStorage.setItem("deleted-projects", "{not json");
    fs.writeFileSync(path.join(notes, "Song.md"), "mine");

    await expect(archiveDeletedProject(makeProject("Song"))).rejects.toBeInstanceOf(StorageUnreadableError);
    expect(fs.readFileSync(path.join(notes, "Song.md"), "utf8")).toBe("mine");
    expect(await LocalStorage.getItem<string>("deleted-projects")).toBe("{not json");
  });

  it("删除前预检：任一份要写的存储损坏都拒绝", async () => {
    await setTrackMap("ep", { Song: 1 });
    await expect(assertDeletionWritable()).resolves.toBeUndefined();

    await LocalStorage.setItem("collection-roles:ep", "{not json");
    await expect(assertDeletionWritable()).rejects.toBeInstanceOf(StorageUnreadableError);
  });

  it("同名新项目（不同文件夹）不继承旧数据", async () => {
    await saveProjectMetadata("Song", metadata);
    await archiveDeletedProject(makeProject("Song", 1000, 42));
    await deleteProjectMetadata("Song");

    const result = await restorePutBackProjects([makeProject("Song", 5000, 99)]);
    expect(result.restored).toEqual([]);
    expect((await getProjectMetadata("Song")).stageId).toBeNull();
  });
});

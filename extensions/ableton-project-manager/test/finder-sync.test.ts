import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { LocalStorage } from "@raycast/api";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { syncFinderChanges } from "../src/core/fs/finder-sync";
import {
  getAllProjectMetadata,
  saveProjectMetadata,
  type ProjectMetadata,
} from "../src/core/metadata/project-metadata";
import { getTrackMap, setTrackMap } from "../src/core/metadata/collection-order";
import { getRoleMap, setRoleMap } from "../src/core/metadata/collection-roles";
import type { Project } from "../src/core/projects/types";
import { __setPreferences, environment } from "./mocks/raycast-api";

// 废纸篓位置由用例控制：真实的 ~/. Trash 读不读得到取决于机器权限，不能依赖。
const trash = vi.hoisted(() => ({ dirs: [] as string[] }));
vi.mock("../src/core/fs/project-snapshot", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  trashDirsFor: () => trash.dirs,
}));

// 删除归档会读现有合集列表；避免加载真实的 taxonomies（用到 Raycast 运行时对象）。
vi.mock("../src/core/metadata/taxonomies", () => ({
  collectionTaxonomy: { get: async () => [{ id: "ep", name: "EP" }] },
}));

const meta: ProjectMetadata = {
  stageId: "mix",
  genreIds: [],
  collectionIds: ["ep"],
  pinned: false,
  pinOrder: null,
  notes: "",
  externalBounceFolders: [],
  externalBounceFiles: [],
};

function makeProject(id: string, createdAt: number, inode: number): Project {
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

const sync = (projects: Project[]) => syncFinderChanges(projects, "/projects", new Set());

async function snapshotIds(): Promise<string[]> {
  const raw = (await LocalStorage.getItem<string>("project-snapshot:/projects")) ?? "[]";
  return (JSON.parse(raw) as { id: string }[]).map((entry) => entry.id);
}

let notes: string;
let trashDir: string;

beforeEach(async () => {
  await LocalStorage.clear();
  notes = fs.mkdtempSync(path.join(os.tmpdir(), "apm-notes-"));
  trashDir = fs.mkdtempSync(path.join(os.tmpdir(), "apm-trash-"));
  trash.dirs = [trashDir];
  environment.supportPath = fs.mkdtempSync(path.join(os.tmpdir(), "apm-support-"));
  __setPreferences({ notesFolder: notes });
});

afterEach(() => {
  __setPreferences({});
  fs.rmSync(notes, { recursive: true, force: true });
  fs.rmSync(trashDir, { recursive: true, force: true });
});

describe("Finder 改名", () => {
  it("第一次运行只记下清单，不做任何改动", async () => {
    await saveProjectMetadata("Song", meta);
    const result = await sync([makeProject("Song", 1000, 1)]);
    expect(result).toMatchObject({ renamed: 0, archived: 0, guardTripped: false });
    expect(await snapshotIds()).toEqual(["Song"]);
  });

  it("迁移元数据、轨号、角色和笔记", async () => {
    await sync([makeProject("Old", 1000, 1)]);
    await saveProjectMetadata("Old", meta);
    await setTrackMap("ep", { Old: 2 });
    await setRoleMap("ep", { Old: "Intro" });
    fs.writeFileSync(path.join(notes, "Old.md"), "mine");

    const result = await sync([makeProject("New", 1000, 1)]);
    expect(result.renamed).toBe(1);
    expect(result.docRenameIssues).toEqual([]);

    const store = await getAllProjectMetadata();
    expect(store.Old).toBeUndefined();
    expect(store.New.stageId).toBe("mix");
    expect(await getTrackMap("ep")).toEqual({ New: 2 });
    expect(await getRoleMap("ep")).toEqual({ New: "Intro" });
    expect(fs.readFileSync(path.join(notes, "New.md"), "utf8")).toBe("mine");
    expect(fs.existsSync(path.join(notes, "Old.md"))).toBe(false);
  });

  it("笔记的目标文件已存在：数据照常迁移，笔记不覆盖并报告", async () => {
    await sync([makeProject("Old", 1000, 1)]);
    fs.writeFileSync(path.join(notes, "Old.md"), "old");
    fs.writeFileSync(path.join(notes, "New.md"), "someone else");

    const result = await sync([makeProject("New", 1000, 1)]);
    expect(result.renamed).toBe(1);
    expect(result.docRenameIssues).toEqual(["New"]);
    expect(fs.readFileSync(path.join(notes, "New.md"), "utf8")).toBe("someone else");
    expect(fs.readFileSync(path.join(notes, "Old.md"), "utf8")).toBe("old");
  });
});

describe("Finder 删除", () => {
  it("确认在废纸篓里：归档并清理数据", async () => {
    const inTrash = path.join(trashDir, "Song 21.30.12");
    fs.mkdirSync(inTrash);
    const stats = fs.statSync(inTrash);
    const song = makeProject("Song", stats.birthtimeMs, stats.ino);
    const keep = makeProject("Keep", 1, 1);
    await sync([song, keep]);
    await saveProjectMetadata("Song", meta);
    await setTrackMap("ep", { Song: 1 });

    const result = await sync([keep]);
    expect(result.archived).toBe(1);
    expect((await getAllProjectMetadata()).Song).toBeUndefined();
    expect(await getTrackMap("ep")).toEqual({});
    const records = JSON.parse((await LocalStorage.getItem<string>("deleted-projects")) ?? "[]") as { id: string }[];
    expect(records.map((record) => record.id)).toEqual(["Song"]);
  });

  it("废纸篓里找不到这个文件夹：不动数据（可能只是移走了）", async () => {
    const keep = makeProject("Keep", 1, 1);
    await sync([makeProject("Song", 1000, 7), keep]);
    await saveProjectMetadata("Song", meta);

    const result = await sync([keep]);
    expect(result).toMatchObject({ archived: 0, trashUnavailable: false });
    expect((await getAllProjectMetadata()).Song.stageId).toBe("mix");
  });

  it("读不到废纸篓（没有完全磁盘访问权限）：不动数据，并标记 trashUnavailable", async () => {
    const keep = makeProject("Keep", 1, 1);
    await sync([makeProject("Song", 1000, 7), keep]);
    await saveProjectMetadata("Song", meta);

    fs.chmodSync(trashDir, 0o000);
    try {
      const result = await sync([keep]);
      expect(result).toMatchObject({ archived: 0, trashUnavailable: true });
      expect((await getAllProjectMetadata()).Song.stageId).toBe("mix");
    } finally {
      fs.chmodSync(trashDir, 0o700);
    }
  });

  it("项目一下子全不见了（如外接盘拔掉）：触发保护，不动数据也不覆盖清单", async () => {
    const a = makeProject("A", 1, 1);
    const b = makeProject("B", 2, 2);
    await sync([a, b]);
    await saveProjectMetadata("A", meta);

    const unplugged = await sync([]);
    expect(unplugged).toMatchObject({ guardTripped: true, archived: 0 });
    expect(await snapshotIds()).toEqual(["A", "B"]);
    expect((await getAllProjectMetadata()).A.stageId).toBe("mix");
  });
});

describe("换 Projects Folder", () => {
  const four = () => [makeProject("A", 1, 1), makeProject("B", 2, 2), makeProject("C", 3, 3), makeProject("D", 4, 4)];

  it("新文件夹当作首次使用，不触发保护；换回来仍和原来的清单比对", async () => {
    await syncFinderChanges(four(), "/projects", new Set());

    const demo = await syncFinderChanges([makeProject("Demo", 9, 9)], "/demo", new Set());
    expect(demo.guardTripped).toBe(false);

    await saveProjectMetadata("A", meta);
    const [, b, c, d] = four();
    const back = await syncFinderChanges([makeProject("A2", 1, 1), b, c, d], "/projects", new Set());
    expect(back).toMatchObject({ guardTripped: false, renamed: 1 });
    expect((await getAllProjectMetadata()).A2.stageId).toBe("mix");
  });

  it("旧版本的清单属于当前文件夹：接着用，并迁到新 key", async () => {
    await LocalStorage.setItem("project-snapshot", JSON.stringify([{ id: "Old", birthtimeMs: 1000, inode: 1 }]));
    await saveProjectMetadata("Old", meta);

    const result = await sync([makeProject("New", 1000, 1)]);
    expect(result.renamed).toBe(1);
    expect(await snapshotIds()).toEqual(["New"]);
    expect(await LocalStorage.getItem<string>("project-snapshot")).toBeUndefined();
  });

  it("旧版本的清单不属于当前文件夹：不报警，留给原来的文件夹认领", async () => {
    const legacy = four().map((p) => ({ id: p.id, birthtimeMs: p.createdAt, inode: p.inode }));
    await LocalStorage.setItem("project-snapshot", JSON.stringify(legacy));

    const demo = await syncFinderChanges([makeProject("Demo", 9, 9)], "/demo", new Set());
    expect(demo.guardTripped).toBe(false);
    expect(await LocalStorage.getItem<string>("project-snapshot")).toBeDefined();

    await syncFinderChanges(four(), "/projects", new Set());
    expect(await LocalStorage.getItem<string>("project-snapshot")).toBeUndefined();
    expect(await snapshotIds()).toEqual(["A", "B", "C", "D"]);
  });
});

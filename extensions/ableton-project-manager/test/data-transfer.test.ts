import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalStorage, environment } from "@raycast/api";

// 测试桩里没有 Color 等 Raycast 运行时对象；这里用最小实现替代真实分类模块。
vi.mock("@/core/metadata/taxonomies", async () => {
  const { createTaxonomy } = await import("@/core/metadata/taxonomy");
  const genreBase = createTaxonomy("genre-options", []);
  return {
    STAGE_DEFAULTS: [],
    GENRE_DEFAULTS: [],
    ROLE_DEFAULTS: [],
    stageTaxonomy: createTaxonomy("stage-options", []),
    collectionTaxonomy: createTaxonomy("collection-options", []),
    roleTaxonomy: createTaxonomy("role-options", []),
    genreTaxonomy: {
      get: async () => {
        const options = await genreBase.get();
        const seeded = await LocalStorage.getItem<string>("genre-options-seeded-v1");
        if (seeded === "true") return options;
        const existing = new Set(options.map((option) => option.id));
        const additions = [{ id: "house", name: "House" }].filter((option) => !existing.has(option.id));
        await genreBase.save([...options, ...additions]);
        await LocalStorage.setItem("genre-options-seeded-v1", "true");
        return genreBase.get();
      },
      save: genreBase.save,
      reset: genreBase.reset,
    },
  };
});

import {
  buildSnapshot,
  CorruptDataError,
  DataFileError,
  exportData,
  exportFileName,
  backupFileName,
  parseDataFile,
  planImport,
  readCurrentData,
  replaceData,
  trackRenames,
  writeJsonFile,
  type DataFile,
} from "@/core/data/data-transfer";
import { genreTaxonomy } from "@/core/metadata/taxonomies";
import type { Project } from "@/core/projects/types";

const EXTENSION = environment.extensionName;

let tempDir: string;

function makeProject(id: string, folderPath: string): Project {
  return {
    id,
    title: id,
    folderPath,
    kind: "folder",
    createdAt: 0,
    inode: 0,
    modifiedAt: 0,
    stageId: null,
    genreIds: [],
    collectionIds: [],
    notes: "",
    lyrics: "",
    pinned: false,
    pinOrder: null,
    setsCount: 0,
    bouncesCount: 0,
    externalBounceFolders: [],
    externalBounceFiles: [],
  };
}

function makeFolder(name: string): string {
  const folder = path.join(tempDir, name);
  fs.mkdirSync(folder, { recursive: true });
  return folder;
}

function metadata(overrides: Record<string, unknown> = {}) {
  return {
    stageId: null,
    genreIds: [],
    collectionIds: [],
    pinned: false,
    pinOrder: null,
    notes: "",
    externalBounceFolders: [],
    externalBounceFiles: [],
    bounceAliases: [],
    previousBounceNames: [],
    excludedSharedBounces: [],
    externalBounceFingerprints: {},
    ...overrides,
  };
}

function dataFile(overrides: Partial<DataFile["data"]> = {}, identities: DataFile["identities"] = {}): DataFile {
  return {
    format: "daw-project-manager-data",
    version: 1,
    extension: EXTENSION,
    exportedAt: new Date().toISOString(),
    identities,
    data: {
      projectMetadata: {},
      taxonomies: {
        "stage-options": [],
        "genre-options": [],
        "collection-options": [],
        "role-options": [],
      },
      collectionPins: [],
      collectionOrders: {},
      collectionRoles: {},
      deletedProjects: [],
      ...overrides,
    },
  };
}

async function seed() {
  await LocalStorage.setItem("project-metadata", JSON.stringify({ alpha: metadata({ notes: "hello" }) }));
  await LocalStorage.setItem("stage-options", JSON.stringify([{ id: "demo", name: "Demo", order: 1 }]));
  await LocalStorage.setItem("genre-options", JSON.stringify([{ id: "house", name: "House" }]));
  await LocalStorage.setItem("genre-options-seeded-v1", "true");
  await LocalStorage.setItem("collection-options", JSON.stringify([{ id: "ep", name: "EP" }]));
  await LocalStorage.setItem("role-options", JSON.stringify([{ id: "intro", name: "Intro", order: 1 }]));
  await LocalStorage.setItem("collection-pins", JSON.stringify(["ep"]));
  await LocalStorage.setItem("collection-order:ep", JSON.stringify({ alpha: 1 }));
  await LocalStorage.setItem("collection-roles:ep", JSON.stringify({ alpha: "Intro" }));
  await LocalStorage.setItem(
    "deleted-projects",
    JSON.stringify([
      {
        id: "gone",
        birthtimeMs: 1000,
        inode: 5,
        deletedAt: Date.now(),
        metadata: null,
        orders: {},
        roles: {},
        docs: [],
      },
    ]),
  );
}

async function snapshotStorage(): Promise<Record<string, string>> {
  return LocalStorage.allItems();
}

beforeEach(async () => {
  await LocalStorage.clear();
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "data-transfer-"));
});

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("export and replace round trip", () => {
  it("restores every exported store", async () => {
    await seed();
    const before = await snapshotStorage();
    const file = await buildSnapshot([]);

    await LocalStorage.clear();
    await replaceData(file, [], tempDir);

    const after = await snapshotStorage();
    for (const key of [
      "project-metadata",
      "stage-options",
      "genre-options",
      "collection-options",
      "role-options",
      "collection-pins",
      "collection-order:ep",
      "collection-roles:ep",
      "deleted-projects",
    ]) {
      expect(after[key]).toBe(before[key]);
    }
  });

  it("leaves excluded stores out of the file", async () => {
    await seed();
    await LocalStorage.setItem("onboarding:shared-bounces-asked", "true");
    await LocalStorage.setItem("audio-analysis-cache-v1", JSON.stringify({ a: 1 }));
    await LocalStorage.setItem("als-metadata-cache-v2", JSON.stringify({ b: 2 }));
    await LocalStorage.setItem("bounces-sort-option", "created-desc");
    await LocalStorage.setItem("project-snapshot:/music", JSON.stringify([]));
    fs.mkdirSync(environment.supportPath, { recursive: true });
    fs.writeFileSync(path.join(environment.supportPath, "doc-folders.json"), JSON.stringify({ notes: "/x" }), {
      flag: "w",
    });

    const file = await buildSnapshot([]);
    const text = JSON.stringify(file);

    expect(text).not.toContain("onboarding");
    expect(text).not.toContain("audio-analysis-cache-v1");
    expect(text).not.toContain("als-metadata-cache-v2");
    expect(text).not.toContain("bounces-sort-option");
    expect(text).not.toContain("project-snapshot");
    expect(text).not.toContain("doc-folders");
  });
});

describe("validation", () => {
  const cases: [string, string, string][] = [
    ["bad JSON", "{not json", "parse"],
    ["wrong format", JSON.stringify({ ...dataFile(), format: "other" }), "format"],
    ["wrong version", JSON.stringify({ ...dataFile(), version: 2 }), "version"],
    ["wrong extension", JSON.stringify({ ...dataFile(), extension: "other-extension" }), "extension"],
    ["bad data", JSON.stringify({ ...dataFile(), data: { projectMetadata: 5 } }), "structure"],
  ];

  for (const [label, raw, reason] of cases) {
    it(`rejects ${label} without touching storage`, async () => {
      await seed();
      const before = await snapshotStorage();
      expect(() => parseDataFile(raw, EXTENSION)).toThrow(DataFileError);
      try {
        parseDataFile(raw, EXTENSION);
      } catch (error) {
        expect((error as DataFileError).reason).toBe(reason);
      }
      expect(await snapshotStorage()).toEqual(before);
    });
  }

  it("names the extension found in the file", () => {
    const raw = JSON.stringify({ ...dataFile(), extension: "other-extension" });
    try {
      parseDataFile(raw, EXTENSION);
    } catch (error) {
      expect((error as DataFileError).message).toContain("other-extension");
    }
  });
});

describe("snapshot restore", () => {
  it("keeps metadata of projects created after the snapshot", async () => {
    await seed();
    await LocalStorage.setItem(
      "project-metadata",
      JSON.stringify({ alpha: metadata({ notes: "old" }), fresh: metadata({ notes: "new" }) }),
    );
    const file = dataFile(
      { projectMetadata: { alpha: metadata({ notes: "from file" }) } },
      {
        alpha: { birthtimeMs: 1, inode: 1 },
      },
    );

    const current = await readCurrentData();
    const plan = planImport(file, current, []);

    expect(plan.data.projectMetadata.alpha.notes).toBe("from file");
    expect(plan.data.projectMetadata.fresh.notes).toBe("new");
    expect(plan.result.kept).toBe(1);
  });

  it("clears metadata of a known project that had none in the file", async () => {
    await seed();
    const file = dataFile({}, { alpha: { birthtimeMs: 1, inode: 1 } });

    const current = await readCurrentData();
    const plan = planImport(file, current, []);

    expect(plan.data.projectMetadata.alpha).toBeUndefined();
    expect(plan.changes.projects).toBe(1);
  });

  it("keeps options and collections added after the snapshot and numbers appended ones", async () => {
    await seed();
    await LocalStorage.setItem(
      "stage-options",
      JSON.stringify([
        { id: "demo", name: "Demo", order: 1 },
        { id: "extra", name: "Extra", order: 2 },
      ]),
    );
    await LocalStorage.setItem(
      "collection-options",
      JSON.stringify([
        { id: "ep", name: "EP" },
        { id: "lp", name: "LP" },
      ]),
    );
    const file = dataFile({
      taxonomies: {
        "stage-options": [{ id: "demo", name: "Demo", order: 1 }],
        "genre-options": [],
        "collection-options": [{ id: "ep", name: "EP" }],
        "role-options": [],
      },
    });

    const current = await readCurrentData();
    const plan = planImport(file, current, []);

    expect(plan.data.taxonomies["stage-options"]).toEqual([
      { id: "demo", name: "Demo", order: 1 },
      { id: "extra", name: "Extra", order: 2 },
    ]);
    expect(plan.data.taxonomies["collection-options"].map((option) => option.id)).toEqual(["ep", "lp"]);
  });

  it("rewrites references to a same-name option and drops unknown ones", async () => {
    await seed();
    const file = dataFile({
      taxonomies: {
        "stage-options": [{ id: "demo", name: "Demo", order: 1 }],
        "genre-options": [{ id: "house-2", name: "House" }],
        "collection-options": [{ id: "ep", name: "EP" }],
        "role-options": [],
      },
      projectMetadata: {
        alpha: metadata({ genreIds: ["house-2", "missing"], collectionIds: ["ep"] }),
      },
    });

    const current = await readCurrentData();
    const plan = planImport(file, current, []);

    // 文件里的选项原样保留（house-2），当前独有的 house 追加在后，所以引用仍然有效。
    expect(plan.data.projectMetadata.alpha.genreIds).toEqual(["house-2"]);
    expect(plan.data.projectMetadata.alpha.collectionIds).toEqual(["ep"]);
  });

  it("keeps a new project's track number when free and drops it when taken", async () => {
    await seed();
    await LocalStorage.setItem(
      "project-metadata",
      JSON.stringify({ alpha: metadata(), fresh: metadata(), other: metadata() }),
    );
    await LocalStorage.setItem("collection-order:ep", JSON.stringify({ alpha: 1, fresh: 2, other: 1 }));
    const file = dataFile(
      {
        taxonomies: {
          "stage-options": [],
          "genre-options": [],
          "collection-options": [{ id: "ep", name: "EP" }],
          "role-options": [],
        },
        collectionOrders: { ep: { alpha: 1 } },
      },
      { alpha: { birthtimeMs: 1, inode: 1 } },
    );

    const current = await readCurrentData();
    const plan = planImport(file, current, []);

    expect(plan.data.collectionOrders.ep).toEqual({ alpha: 1, fresh: 2 });
    expect(plan.result.droppedTracks).toBe(1);
  });

  it("drops a known project's track number when the file has no order key for that collection", async () => {
    await seed();
    await LocalStorage.setItem("project-metadata", JSON.stringify({ alpha: metadata(), fresh: metadata() }));
    await LocalStorage.setItem("collection-order:ep", JSON.stringify({ alpha: 1, fresh: 2 }));
    const file = dataFile(
      {
        taxonomies: {
          "stage-options": [],
          "genre-options": [],
          "collection-options": [{ id: "ep", name: "EP" }],
          "role-options": [],
        },
      },
      { alpha: { birthtimeMs: 1, inode: 1 } },
    );

    const current = await readCurrentData();
    const plan = planImport(file, current, []);

    // ep 在文件的 collection-options 里，所以快照认识它：曲序从空 map 出发，只补快照不知道的项目。
    expect(plan.data.collectionOrders.ep).toEqual({ fresh: 2 });
    expect(plan.changes.collections).toBe(1);
  });

  it("counts a merged same-name genre as one option change", async () => {
    await seed();
    await LocalStorage.setItem("genre-options", JSON.stringify([{ id: "house-2", name: "House" }]));
    const file = dataFile({
      taxonomies: {
        "stage-options": [],
        "genre-options": [{ id: "house", name: "House" }],
        "collection-options": [],
        "role-options": [],
      },
    });

    const current = await readCurrentData();
    const plan = planImport(file, current, []);

    expect(plan.changes.options).toBe(1);
  });

  it("removes the order key when the file has none for a known collection", async () => {
    await seed();
    await LocalStorage.setItem("collection-order:ep", JSON.stringify({ alpha: 1 }));
    const file = dataFile(
      {
        taxonomies: {
          "stage-options": [],
          "genre-options": [],
          "collection-options": [{ id: "ep", name: "EP" }],
          "role-options": [],
        },
      },
      { alpha: { birthtimeMs: 1, inode: 1 } },
    );

    const current = await readCurrentData();
    const plan = planImport(file, current, []);

    expect(plan.data.collectionOrders.ep).toBeUndefined();
    expect(plan.changes.collections).toBe(1);

    await replaceData(file, [], tempDir);
    expect(await LocalStorage.getItem<string>("collection-order:ep")).toBeUndefined();
  });

  it("treats a missing order and role key as nothing to change", async () => {
    await seed();
    await LocalStorage.setItem("collection-options", JSON.stringify([{ id: "ep", name: "EP" }]));
    await LocalStorage.removeItem("collection-order:ep");
    await LocalStorage.removeItem("collection-roles:ep");

    const file = await buildSnapshot([]);
    const current = await readCurrentData();
    const plan = planImport(file, current, []);

    expect(plan.unchanged).toBe(true);

    const before = await snapshotStorage();
    const report = await replaceData(file, [], tempDir);
    expect(report.backupPath).toBeNull();
    expect(await snapshotStorage()).toEqual(before);
  });

  it("puts the file's pins first and appends current-only ones", async () => {
    await seed();
    await LocalStorage.setItem("collection-pins", JSON.stringify(["lp", "ep"]));
    const file = dataFile({ collectionPins: ["ep"] });

    const current = await readCurrentData();
    const plan = planImport(file, current, []);

    expect(plan.data.collectionPins).toEqual(["ep", "lp"]);
    expect(plan.changes.pins).toBe(1);
  });

  it("counts no changes when current data equals the defaults", async () => {
    const file = dataFile();
    const current = await readCurrentData();
    const plan = planImport(file, current, []);

    expect(plan.changeCount).toBe(0);
  });

  it("writes no backup when there is nothing to change", async () => {
    await seed();
    const file = await buildSnapshot([]);
    const report = await replaceData(file, [], tempDir);

    expect(report.backupPath).toBeNull();
    expect(fs.readdirSync(tempDir)).toEqual([]);
  });

  it("reports nothing to change on a second import of the same file", async () => {
    await seed();
    const file = await buildSnapshot([]);
    await replaceData(file, [], tempDir);

    const current = await readCurrentData();
    const plan = planImport(file, current, []);
    expect(plan.unchanged).toBe(true);

    const before = await snapshotStorage();
    const report = await replaceData(file, [], tempDir);
    expect(report.backupPath).toBeNull();
    expect(await snapshotStorage()).toEqual(before);
  });

  it("counts each kind of change", async () => {
    await seed();
    await LocalStorage.setItem(
      "project-metadata",
      JSON.stringify({ alpha: metadata({ notes: "old" }), beta: metadata({ notes: "keep" }) }),
    );
    await LocalStorage.setItem("collection-pins", JSON.stringify(["ep"]));
    const file = dataFile(
      {
        taxonomies: {
          "stage-options": [{ id: "demo", name: "Demo", order: 1 }],
          "genre-options": [{ id: "house", name: "House" }],
          "collection-options": [{ id: "ep", name: "EP" }],
          "role-options": [{ id: "intro", name: "Intro", order: 1 }],
        },
        projectMetadata: { alpha: metadata({ notes: "new" }) },
        collectionPins: ["lp"],
        collectionOrders: { ep: { alpha: 2 } },
        collectionRoles: { ep: { alpha: "Intro" } },
      },
      { alpha: { birthtimeMs: 1, inode: 1 } },
    );

    const current = await readCurrentData();
    const plan = planImport(file, current, []);

    expect(plan.changes.projects).toBe(1);
    expect(plan.changes.collections).toBe(1);
    expect(plan.changes.pins).toBe(1);
  });

  it("merges a same-name genre and points the new project at the file's id", async () => {
    await seed();
    await LocalStorage.setItem("genre-options", JSON.stringify([{ id: "house-2", name: "House" }]));
    await LocalStorage.setItem(
      "project-metadata",
      JSON.stringify({ alpha: metadata(), fresh: metadata({ genreIds: ["house-2"] }) }),
    );
    const file = dataFile(
      {
        taxonomies: {
          "stage-options": [],
          "genre-options": [{ id: "house", name: "House" }],
          "collection-options": [],
          "role-options": [],
        },
      },
      { alpha: { birthtimeMs: 1, inode: 1 } },
    );

    const current = await readCurrentData();
    const plan = planImport(file, current, []);

    expect(plan.data.taxonomies["genre-options"]).toEqual([{ id: "house", name: "House" }]);
    expect(plan.data.projectMetadata.fresh.genreIds).toEqual(["house"]);
  });

  it("merges a same-name collection and folds its orders and pins into the file's id", async () => {
    await seed();
    await LocalStorage.setItem("collection-options", JSON.stringify([{ id: "ep-2", name: "EP" }]));
    await LocalStorage.setItem("collection-order:ep-2", JSON.stringify({ fresh: 2 }));
    await LocalStorage.setItem("collection-roles:ep-2", JSON.stringify({ fresh: "Intro" }));
    await LocalStorage.setItem("collection-pins", JSON.stringify(["ep-2"]));
    const file = dataFile(
      {
        taxonomies: {
          "stage-options": [],
          "genre-options": [],
          "collection-options": [{ id: "ep", name: "EP" }],
          "role-options": [],
        },
        collectionOrders: { ep: { alpha: 1 } },
        collectionPins: ["ep"],
      },
      { alpha: { birthtimeMs: 1, inode: 1 } },
    );

    const current = await readCurrentData();
    const plan = planImport(file, current, []);

    expect(plan.data.taxonomies["collection-options"]).toEqual([{ id: "ep", name: "EP" }]);
    expect(plan.data.collectionOrders.ep).toEqual({ alpha: 1, fresh: 2 });
    expect(plan.data.collectionOrders["ep-2"]).toBeUndefined();
    // ep 在文件的 collection-options 里，所以快照认识它：角色从空 map 出发，只补快照不知道的项目。
    expect(plan.data.collectionRoles.ep).toEqual({ fresh: "Intro" });
    expect(plan.data.collectionRoles["ep-2"]).toBeUndefined();
    expect(plan.data.collectionPins).toEqual(["ep"]);
  });

  it("counts an option change when only aliases differ", async () => {
    await seed();
    await LocalStorage.setItem("genre-options", JSON.stringify([{ id: "house", name: "House", aliases: ["deep"] }]));
    const file = dataFile({
      taxonomies: {
        "stage-options": [],
        "genre-options": [{ id: "house", name: "House" }],
        "collection-options": [],
        "role-options": [],
      },
    });

    const current = await readCurrentData();
    const plan = planImport(file, current, []);

    expect(plan.changes.options).toBe(1);
  });

  it("uses the new id after rename tracking when deciding what the snapshot knows", async () => {
    await seed();
    const folder = makeFolder("Renamed");
    const stats = fs.statSync(folder);
    const projects = [makeProject("renamed", folder)];
    const file = dataFile(
      { projectMetadata: { old: metadata({ notes: "kept" }) } },
      { old: { birthtimeMs: stats.birthtimeMs, inode: stats.ino } },
    );

    const current = await readCurrentData();
    const plan = planImport(file, current, projects);

    expect(plan.result.rematched).toBe(1);
    expect(plan.data.projectMetadata.renamed.notes).toBe("kept");
    expect(plan.data.projectMetadata.old).toBeUndefined();
  });
});

describe("rename tracking", () => {
  it("imports as-is and counts unmatched when the identity differs", async () => {
    await seed();
    const folder = makeFolder("Other");
    const projects = [makeProject("other", folder)];
    const file = dataFile({ projectMetadata: { old: metadata() } }, { old: { birthtimeMs: 1, inode: 1 } });

    const report = await replaceData(file, projects, tempDir);

    expect(report.unmatched).toBe(1);
    const store = JSON.parse((await LocalStorage.getItem<string>("project-metadata")) ?? "{}");
    expect(store.old).toBeDefined();
  });

  it("does not rename when the target id already has its own entry", async () => {
    await seed();
    const folder = makeFolder("Renamed");
    const stats = fs.statSync(folder);
    const projects = [makeProject("renamed", folder)];
    const file = dataFile(
      { projectMetadata: { old: metadata({ notes: "old" }), renamed: metadata({ notes: "own" }) } },
      { old: { birthtimeMs: stats.birthtimeMs, inode: stats.ino } },
    );

    const report = await replaceData(file, projects, tempDir);

    expect(report.unmatched).toBe(1);
    const store = JSON.parse((await LocalStorage.getItem<string>("project-metadata")) ?? "{}");
    expect(store.renamed.notes).toBe("own");
    expect(store.old.notes).toBe("old");
  });
});

describe("validation of each block", () => {
  it("accepts a deleted record older than 30 days and does not write it", async () => {
    await seed();
    const old = {
      id: "ancient",
      birthtimeMs: 500,
      inode: 9,
      deletedAt: Date.now() - 40 * 24 * 60 * 60 * 1000,
      metadata: null,
      orders: {},
      roles: {},
      docs: [],
    };
    const file = dataFile({ deletedProjects: [old] });

    await replaceData(file, [], tempDir);

    const records = JSON.parse((await LocalStorage.getItem<string>("deleted-projects")) ?? "[]");
    expect(records.map((r: { id: string }) => r.id)).not.toContain("ancient");
  });

  it("accepts a deleted record whose metadata lacks newer fields", async () => {
    await seed();
    const legacy = {
      id: "legacy",
      birthtimeMs: 700,
      inode: 11,
      deletedAt: Date.now(),
      metadata: { stageId: null, genreIds: [], collectionIds: [], pinned: false, pinOrder: null, notes: "" },
      orders: {},
      roles: {},
      docs: [],
    };
    const file = dataFile({ deletedProjects: [legacy] });

    await replaceData(file, [], tempDir);

    const records = JSON.parse((await LocalStorage.getItem<string>("deleted-projects")) ?? "[]");
    expect(records.map((r: { id: string }) => r.id)).toContain("legacy");
  });

  it("rejects a block with the wrong top-level type and names it", async () => {
    await seed();
    const before = await snapshotStorage();
    const raw = JSON.stringify({ ...dataFile(), data: { ...dataFile().data, projectMetadata: [] } });

    expect(() => parseDataFile(raw, EXTENSION)).toThrow(DataFileError);
    try {
      parseDataFile(raw, EXTENSION);
    } catch (error) {
      expect((error as DataFileError).reason).toBe("structure");
      expect((error as DataFileError).message).toContain("projectMetadata");
    }
    expect(await snapshotStorage()).toEqual(before);
  });
});

describe("deleted projects", () => {
  it("unions records and never drops existing ones", async () => {
    await seed();
    const extra = {
      id: "gone-2",
      birthtimeMs: 2000,
      inode: 6,
      deletedAt: Date.now(),
      metadata: null,
      orders: {},
      roles: {},
      docs: [],
    };
    const file = dataFile({ deletedProjects: [extra] });

    await replaceData(file, [], tempDir);
    const records = JSON.parse((await LocalStorage.getItem<string>("deleted-projects")) ?? "[]");
    expect(records.map((r: { id: string }) => r.id).sort()).toEqual(["gone", "gone-2"]);
  });
});

describe("replace", () => {
  it("keeps collection keys missing from the file", async () => {
    await seed();
    await LocalStorage.setItem("collection-order:other", JSON.stringify({ alpha: 3 }));
    await LocalStorage.setItem("collection-roles:other", JSON.stringify({ alpha: "Intro" }));

    await replaceData(dataFile(), [], tempDir);

    expect(JSON.parse((await LocalStorage.getItem<string>("collection-order:other")) ?? "{}")).toEqual({ alpha: 3 });
    expect(JSON.parse((await LocalStorage.getItem<string>("collection-roles:other")) ?? "{}")).toEqual({
      alpha: "Intro",
    });
  });

  it("writes a backup before replacing", async () => {
    await seed();
    const report = await replaceData(dataFile({}, { alpha: { birthtimeMs: 1, inode: 1 } }), [], tempDir);

    expect(report.backupPath).not.toBeNull();
    const backup = JSON.parse(fs.readFileSync(report.backupPath as string, "utf8"));
    expect(backup.data.projectMetadata.alpha.notes).toBe("hello");
  });

  it("aborts without changes when the backup cannot be written", async () => {
    await seed();
    const before = await snapshotStorage();
    const missing = path.join(tempDir, "missing-folder");

    await expect(replaceData(dataFile({}, { alpha: { birthtimeMs: 1, inode: 1 } }), [], missing)).rejects.toThrow();
    expect(await snapshotStorage()).toEqual(before);
  });
});

describe("file names", () => {
  it("formats export and backup names", () => {
    const now = new Date(2026, 0, 2, 4, 48, 7);
    expect(exportFileName(now)).toBe(`${EXTENSION}-data-2026-01-02-0448.json`);
    expect(backupFileName(now)).toBe(`${EXTENSION}-backup-before-import-2026-01-02-044807.json`);
  });

  it("adds 2 and 3 instead of overwriting", () => {
    const first = writeJsonFile(tempDir, "x.json", "a");
    const second = writeJsonFile(tempDir, "x.json", "b");
    const third = writeJsonFile(tempDir, "x.json", "c");

    expect(path.basename(first)).toBe("x.json");
    expect(path.basename(second)).toBe("x 2.json");
    expect(path.basename(third)).toBe("x 3.json");
    expect(fs.readFileSync(first, "utf8")).toBe("a");
  });
});

describe("genre seed marker", () => {
  it("does not bring back a removed default genre after replace", async () => {
    await LocalStorage.setItem("genre-options", JSON.stringify([{ id: "house", name: "House" }]));
    await LocalStorage.setItem("genre-options-seeded-v1", "true");
    const file = dataFile({
      taxonomies: {
        "stage-options": [],
        "genre-options": [{ id: "house", name: "House" }],
        "collection-options": [],
        "role-options": [],
      },
    });

    await LocalStorage.clear();
    await replaceData(file, [], tempDir);

    const genres = await genreTaxonomy.get();
    expect(genres.map((genre) => genre.id)).toEqual(["house"]);
  });
});

describe("corrupt storage", () => {
  it("refuses to export and writes no file", async () => {
    await seed();
    await LocalStorage.setItem("stage-options", "{broken");

    await expect(exportData(tempDir, [])).rejects.toThrow();
    expect(fs.readdirSync(tempDir)).toEqual([]);
  });

  it("refuses to replace when a category key is corrupt and writes no backup", async () => {
    await seed();
    await LocalStorage.setItem("stage-options", "{broken");
    const before = await snapshotStorage();

    await expect(replaceData(dataFile(), [], tempDir)).rejects.toThrow(CorruptDataError);
    expect(await snapshotStorage()).toEqual(before);
    expect(fs.readdirSync(tempDir)).toEqual([]);
  });
});

describe("import validation", () => {
  function deletedRecord(overrides: Record<string, unknown> = {}) {
    return {
      id: "gone",
      birthtimeMs: 1000,
      inode: 5,
      deletedAt: Date.now(),
      metadata: null,
      orders: {},
      roles: {},
      docs: [],
      ...overrides,
    };
  }

  function expectStructureError(file: DataFile): void {
    const raw = JSON.stringify(file);
    expect(() => parseDataFile(raw, EXTENSION)).toThrow(DataFileError);
    try {
      parseDataFile(raw, EXTENSION);
    } catch (error) {
      expect((error as DataFileError).reason).toBe("structure");
    }
  }

  it("rejects an archived doc path outside Deleted Projects", () => {
    expectStructureError(
      dataFile({ deletedProjects: [deletedRecord({ docs: [{ kind: "notes", relativePath: "../secret.md" }] })] }),
    );
  });

  it("rejects a deleted record without birthtimeMs", () => {
    const record = deletedRecord();
    delete (record as Record<string, unknown>).birthtimeMs;
    expectStructureError(dataFile({ deletedProjects: [record] }));
  });

  it("rejects metadata whose externalBounceFiles is not an array", () => {
    expectStructureError(dataFile({ projectMetadata: { alpha: metadata({ externalBounceFiles: {} }) } }));
  });

  it("accepts a deleted record whose doc sits inside Deleted Projects", () => {
    const file = dataFile({
      deletedProjects: [
        deletedRecord({ docs: [{ kind: "notes", relativePath: path.join("Deleted Projects", "Song.md") }] }),
      ],
    });

    const parsed = parseDataFile(JSON.stringify(file), EXTENSION);
    expect(parsed.data.deletedProjects).toHaveLength(1);
  });

  it("moves the identity to the new id when the old name belongs to another folder", () => {
    const folderA = makeFolder("A");
    const folderB = makeFolder("B");
    const statsA = fs.statSync(folderA);
    const projects = [makeProject("New", folderA), makeProject("Old", folderB)];
    const data = dataFile({ projectMetadata: { Old: metadata({ notes: "kept" }) } }).data;

    const result = trackRenames(data, { Old: { birthtimeMs: statsA.birthtimeMs, inode: statsA.ino } }, projects);

    expect(result.data.projectMetadata.New.notes).toBe("kept");
    expect(result.data.projectMetadata.Old).toBeUndefined();
    expect(result.identities.Old).toBeUndefined();
    expect(result.identities.New).toBeDefined();
  });
});

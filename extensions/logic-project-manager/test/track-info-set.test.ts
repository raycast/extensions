import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { daw, type DawSet } from "@/daws";
import { loadTrackInfo } from "@/core/projects/track-info";
import type { Project } from "@/core/projects/types";

function project(id: string): Project {
  return {
    id,
    title: id,
    folderPath: `/nonexistent/${id}`,
    kind: "folder",
    createdAt: 0,
    inode: 1,
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
    projectFilesCount: null,
    externalBounceFolders: [],
    externalBounceFiles: [],
  };
}

// 元数据文件要真实存在：解析前会 stat 它，读不到就当作没有元数据。
const root = fs.mkdtempSync(path.join(os.tmpdir(), "track-info-set-"));

function set(name: string, modifiedAt: number, active?: boolean): DawSet {
  const metadataFile = path.join(root, `${name}.plist`);
  fs.writeFileSync(metadataFile, "stub");
  return {
    name,
    path: path.join(root, name),
    metadataFile,
    createdAt: 0,
    modifiedAt,
    ...(active === undefined ? {} : { active }),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loadTrackInfo 的 Set 选择", () => {
  it("有多个 Set 但都不是 active 时，BPM / Key / 拍号都是空", async () => {
    vi.spyOn(daw, "listSets").mockReturnValue([set("000", 300, false), set("003", 100, false)]);
    const parseSet = vi.spyOn(daw, "parseSet");

    const info = await loadTrackInfo(project("Demo"));

    expect(info.bpm).toBeNull();
    expect(info.key).toBeNull();
    expect(info.timeSignature).toBeNull();
    // 没有 current Set 就不该去解析任何一个 Set。
    expect(parseSet).not.toHaveBeenCalled();
  });

  it("有 active 的 Set 时用它，不看修改时间", async () => {
    vi.spyOn(daw, "listSets").mockReturnValue([set("000", 300), set("003", 100, true)]);
    const parseSet = vi.spyOn(daw, "parseSet").mockResolvedValue({ bpm: 128, timeSignature: "4/4", key: "C Major" });

    const info = await loadTrackInfo(project("Demo"));

    expect(parseSet).toHaveBeenCalledWith(expect.objectContaining({ name: "003" }));
    expect(info.bpm).toBe(128);
    expect(info.key).toBe("C Major");
  });

  it("全都没有 active 字段时取修改时间最新的", async () => {
    vi.spyOn(daw, "listSets").mockReturnValue([set("000", 100), set("003", 300), set("004", 200)]);
    const parseSet = vi.spyOn(daw, "parseSet").mockResolvedValue({ bpm: 90, timeSignature: "3/4", key: null });

    const info = await loadTrackInfo(project("Demo"));

    expect(parseSet).toHaveBeenCalledWith(expect.objectContaining({ name: "003" }));
    expect(info.bpm).toBe(90);
  });

  it("没有 Set 时也是空", async () => {
    vi.spyOn(daw, "listSets").mockReturnValue([]);
    const info = await loadTrackInfo(project("Demo"));
    expect(info.bpm).toBeNull();
    expect(info.key).toBeNull();
  });
});

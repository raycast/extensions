import { describe, expect, it } from "vitest";
import { parseProjectList, sameFsFields, serializeProjectList } from "@/core/projects/list-cache";
import type { Project } from "@/core/projects/types";

const project = (over: Partial<Project> = {}): Project => ({
  id: "Demo",
  title: "Demo",
  folderPath: "/Projects/Demo",
  kind: "package",
  createdAt: 1700000000000,
  inode: 12345,
  modifiedAt: 1700000001000,
  stageId: null,
  genreIds: [],
  collectionIds: [],
  notes: "",
  lyrics: "",
  pinned: false,
  pinOrder: null,
  setsCount: 1,
  bouncesCount: 0,
  projectFilesCount: null,
  externalBounceFolders: [],
  externalBounceFiles: [],
  ...over,
});

describe("serializeProjectList / parseProjectList", () => {
  it("序列化再解析，结果和原来一致", () => {
    const projects = [
      project(),
      project({
        id: "Other",
        title: "Other",
        kind: "folder",
        stageId: "stage-1",
        genreIds: ["genre-1"],
        collectionIds: ["collection-1"],
        notes: "note",
        lyrics: "lyric",
        pinned: true,
        pinOrder: 0,
        setsCount: 3,
        bouncesCount: 2,
        externalBounceFolders: ["/Bounces"],
        externalBounceFiles: ["/Bounces/a.wav"],
      }),
    ];
    expect(parseProjectList(serializeProjectList(projects))).toEqual(projects);
  });

  it("时间字段解析后仍是数字", () => {
    const [parsed] = parseProjectList(serializeProjectList([project()])) ?? [];
    expect(typeof parsed.createdAt).toBe("number");
    expect(typeof parsed.modifiedAt).toBe("number");
  });

  it("空字符串返回 undefined", () => {
    expect(parseProjectList("")).toBeUndefined();
    expect(parseProjectList(undefined)).toBeUndefined();
  });

  it("JSON 坏了返回 undefined", () => {
    expect(parseProjectList("{not json")).toBeUndefined();
  });

  it("version 不对返回 undefined", () => {
    expect(parseProjectList(JSON.stringify({ version: 2, projects: [] }))).toBeUndefined();
  });

  it("projects 不是数组返回 undefined", () => {
    expect(parseProjectList(JSON.stringify({ version: 1, projects: {} }))).toBeUndefined();
  });
});

describe("sameFsFields", () => {
  it("完全相同返回 true", () => {
    expect(sameFsFields([project()], [project()])).toBe(true);
  });

  it("只是顺序不同返回 true", () => {
    const a = project();
    const b = project({ id: "Other", title: "Other", folderPath: "/Projects/Other" });
    expect(sameFsFields([a, b], [b, a])).toBe(true);
  });

  it("多一个项目返回 false", () => {
    const b = project({ id: "Other", title: "Other", folderPath: "/Projects/Other" });
    expect(sameFsFields([project(), b], [project()])).toBe(false);
  });

  it("少一个项目返回 false", () => {
    const b = project({ id: "Other", title: "Other", folderPath: "/Projects/Other" });
    expect(sameFsFields([project()], [project(), b])).toBe(false);
  });

  it("id 变了（改名）返回 false", () => {
    expect(sameFsFields([project({ id: "Renamed", title: "Renamed" })], [project()])).toBe(false);
  });

  it("modifiedAt 变了返回 false", () => {
    expect(sameFsFields([project({ modifiedAt: 1700000002000 })], [project()])).toBe(false);
  });

  it("只有元数据或文档字段不同返回 true", () => {
    const cached = project({
      stageId: "stage-1",
      genreIds: ["genre-1"],
      collectionIds: ["collection-1"],
      notes: "note",
      lyrics: "lyric",
      pinned: true,
      pinOrder: 0,
      bouncesCount: 3,
      externalBounceFolders: ["/Bounces"],
      externalBounceFiles: ["/Bounces/a.wav"],
    });
    expect(sameFsFields([project()], [cached])).toBe(true);
  });
});

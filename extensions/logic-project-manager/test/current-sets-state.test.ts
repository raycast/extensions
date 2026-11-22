import { describe, expect, it } from "vitest";
import type { DawSet, ProjectFileMetadata } from "@/daws";
import type { Project } from "@/core/projects/types";
import {
  applySetMetadata,
  planCurrentSetReads,
  SET_PROGRESS_MIN,
  shouldShowSetProgress,
  type CurrentSetInfo,
} from "@/core/ui/projects/current-sets-state";

function makeSet(path: string, active?: boolean): DawSet {
  return {
    name: path,
    path,
    metadataFile: `${path}/meta`,
    modifiedAt: 0,
    active,
  } as DawSet;
}

function makeProject(id: string): Project {
  return { id, title: id, folderPath: `/p/${id}`, kind: "package" } as Project;
}

const metadata = { bpm: 120, key: "C" } as ProjectFileMetadata;

describe("planCurrentSetReads", () => {
  it("有缓存的进 initial，没缓存的进 missing", async () => {
    const cachedSet = makeSet("/a");
    const uncachedSet = makeSet("/b");
    const { initial, missing } = await planCurrentSetReads(
      [makeProject("a"), makeProject("b")],
      (project) => (project.id === "a" ? [cachedSet] : [uncachedSet]),
      (sets) => sets[0] ?? null,
      (set) => (set.path === "/a" ? metadata : null),
      () => false,
    );

    expect(initial).toEqual({
      a: { set: cachedSet, metadata },
      b: { set: uncachedSet, metadata: null },
    });
    expect(missing).toEqual([["b", uncachedSet]]);
  });

  it("没有 current Set 的项目跳过", async () => {
    const { initial, missing } = await planCurrentSetReads(
      [makeProject("a")],
      () => [],
      () => null,
      () => null,
      () => false,
    );
    expect(initial).toEqual({});
    expect(missing).toEqual([]);
  });

  it("取消后不再读剩下的项目", async () => {
    const read: string[] = [];
    const { initial } = await planCurrentSetReads(
      [makeProject("a"), makeProject("b"), makeProject("c")],
      (project) => {
        read.push(project.id);
        return [makeSet(`/${project.id}`)];
      },
      (sets) => sets[0] ?? null,
      () => metadata,
      () => read.length >= 1,
    );
    expect(read.length).toBeLessThan(3);
    expect(Object.keys(initial).length).toBeLessThan(3);
  });
});

describe("applySetMetadata", () => {
  const set = makeSet("/a");

  it("路径一致时写入", () => {
    const prev: Record<string, CurrentSetInfo> = { a: { set, metadata: null } };
    expect(applySetMetadata(prev, "a", set, metadata)).toEqual({ a: { set, metadata } });
  });

  it("期间换了 Set 时原样返回", () => {
    const prev: Record<string, CurrentSetInfo> = { a: { set: makeSet("/newer"), metadata: null } };
    expect(applySetMetadata(prev, "a", set, metadata)).toBe(prev);
  });

  it("项目已经不在列表里时原样返回", () => {
    const prev: Record<string, CurrentSetInfo> = {};
    expect(applySetMetadata(prev, "a", set, metadata)).toBe(prev);
  });
});

describe("shouldShowSetProgress", () => {
  it("数量够多且没在播放时弹", () => {
    expect(shouldShowSetProgress(SET_PROGRESS_MIN, false)).toBe(true);
  });

  it("数量不够时不弹", () => {
    expect(shouldShowSetProgress(SET_PROGRESS_MIN - 1, false)).toBe(false);
  });

  it("正在播放时不弹，免得盖住播放提示", () => {
    expect(shouldShowSetProgress(SET_PROGRESS_MIN, true)).toBe(false);
  });
});

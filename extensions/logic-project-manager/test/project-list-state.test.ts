import { describe, expect, it } from "vitest";
import type { Project } from "@/core/projects/types";
import {
  shouldCommitProjects,
  shouldShowLoadingOnScan,
  shouldWriteListCache,
} from "@/core/ui/projects/project-list-state";

function makeProject(id: string, modifiedAt = 0): Project {
  return { id, title: id, folderPath: `/p/${id}`, kind: "package", modifiedAt } as Project;
}

describe("shouldCommitProjects", () => {
  it("非静默刷新时总是提交", () => {
    const list = [makeProject("a")];
    expect(shouldCommitProjects(false, list, list)).toBe(true);
  });

  it("静默刷新且内容没变时不提交，保留原引用", () => {
    expect(shouldCommitProjects(true, [makeProject("a")], [makeProject("a")])).toBe(false);
  });

  it("静默刷新但内容变了时提交", () => {
    expect(shouldCommitProjects(true, [makeProject("a"), makeProject("b")], [makeProject("a")])).toBe(true);
  });
});

describe("shouldShowLoadingOnScan", () => {
  it("非静默刷新时不显示加载", () => {
    expect(shouldShowLoadingOnScan(false, [makeProject("a")], [])).toBe(false);
  });

  it("静默刷新且磁盘上有变化时显示加载", () => {
    expect(shouldShowLoadingOnScan(true, [makeProject("a")], [])).toBe(true);
  });

  it("静默刷新且磁盘上没变化时不显示加载", () => {
    expect(shouldShowLoadingOnScan(true, [makeProject("a")], [makeProject("a")])).toBe(false);
  });
});

describe("shouldWriteListCache", () => {
  const list = [makeProject("a")];

  it("加载中不写", () => {
    expect(shouldWriteListCache(true, list, undefined)).toBe(false);
  });

  it("和上次写的是同一份时不写", () => {
    expect(shouldWriteListCache(false, list, list)).toBe(false);
  });

  it("加载完且是新的一份时写", () => {
    expect(shouldWriteListCache(false, list, undefined)).toBe(true);
  });
});

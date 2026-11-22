import { describe, expect, it } from "vitest";
import { projectAccessories } from "@/core/ui/projects/project-accessories";
import type { Project } from "@/core/projects/types";
import type { ProjectFilesInfo } from "@/daws/types";

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: "A",
    title: "A",
    folderPath: "/projects/A",
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
    setsCount: 3,
    bouncesCount: 2,
    projectFilesCount: null,
    externalBounceFolders: [],
    externalBounceFiles: [],
    ...overrides,
  };
}

function files(count: number): ProjectFilesInfo {
  return {
    count,
    latestName: (path) => path,
    labels: {
      projectFiles: "Project Files",
      latestProjectFile: "Latest Project File",
      viewProjectFiles: "View Project Files",
      openLatestProjectFile: "Open Latest Project File",
    },
  };
}

describe("projectAccessories", () => {
  it("没有 Stage、没有工程文件层时：Set 数 + Bounce 数", () => {
    const result = projectAccessories({ project: project(), stage: undefined, files: null, setsLabel: "Sets" });
    expect(result).toEqual([
      { text: "3", tooltip: "3 Sets" },
      { icon: "Document", tooltip: "3 Sets" },
      { text: "2", tooltip: "2 Bounces" },
      { icon: "Waveform", tooltip: "2 Bounces" },
    ]);
  });

  it("有 Stage 时 Stage 排在最前", () => {
    const result = projectAccessories({
      project: project({ stageId: "s1" }),
      stage: { id: "s1", name: "Mix" },
      files: null,
      setsLabel: "Sets",
    });
    expect(result[0]).toEqual({ tag: { value: "Mix", color: "SecondaryText" } });
  });

  it("有工程文件层时显示工程文件数，不显示 Set 数", () => {
    const result = projectAccessories({
      project: project(),
      stage: undefined,
      files: files(4),
      setsLabel: "Sets",
    });
    expect(result).toEqual([
      { text: "4", tooltip: "4 Project Files" },
      { icon: "package.png", tooltip: "4 Project Files" },
      { text: "2", tooltip: "2 Bounces" },
      { icon: "Waveform", tooltip: "2 Bounces" },
    ]);
  });

  it("Set 的叫法由调用方传入", () => {
    const result = projectAccessories({ project: project(), stage: undefined, files: null, setsLabel: "Alternatives" });
    expect(result[0]).toEqual({ text: "3", tooltip: "3 Alternatives" });
  });
});

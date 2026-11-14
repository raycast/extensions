import { describe, expect, it } from "vitest";
import { rowsFromProject, tagWithProject } from "../src/helpers/project-scoped";

describe("rows tied to the project that produced them", () => {
  const fromA = tagWithProject([{ id: "intake-1" }, { id: "intake-2" }], "project-a");

  it("tags each row with its project", () => {
    expect(fromA).toEqual([
      { id: "intake-1", sourceProjectId: "project-a" },
      { id: "intake-2", sourceProjectId: "project-a" },
    ]);
  });

  it("hides the previous project's rows while the newly selected project loads", () => {
    // keepPreviousData still holds project A's rows after switching to project B.
    expect(rowsFromProject(fromA, "project-b")).toEqual([]);
    expect(rowsFromProject(fromA, "project-a")).toHaveLength(2);
  });

  it("keeps workspace-level rows ('') apart from project rows", () => {
    const workspacePages = tagWithProject([{ id: "page-1" }], "");
    expect(rowsFromProject(workspacePages, "")).toHaveLength(1);
    expect(rowsFromProject(workspacePages, "project-a")).toEqual([]);
    expect(rowsFromProject(fromA, "")).toEqual([]);
  });

  it("shows nothing before a project is selected, and drops untagged cached rows", () => {
    expect(rowsFromProject(fromA, undefined)).toEqual([]);
    expect(rowsFromProject([{ id: "old-cache" }], "project-a")).toEqual([]);
    expect(rowsFromProject(undefined, "project-a")).toEqual([]);
  });
});

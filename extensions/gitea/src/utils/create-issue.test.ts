import { describe, expect, it } from "vitest";
import { buildCreateIssueParams, groupLabels, parseRepo } from "./create-issue";
import type { Label } from "../types/api";

describe("create issue helpers", () => {
  it("splits repository full names", () => {
    expect(parseRepo("owner/repo")).toEqual({ owner: "owner", repo: "repo" });
    expect(parseRepo()).toEqual({ owner: undefined, repo: undefined });
  });

  it("separates regular and exclusive labels", () => {
    const labels = [
      { id: 1, name: "bug", exclusive: false },
      { id: 2, name: "priority/high", exclusive: true },
      { id: 3, name: "priority/low", exclusive: true },
    ] as Label[];

    expect(groupLabels(labels)).toEqual({
      regular: [labels[0]],
      exclusive: {
        priority: [labels[1], labels[2]],
      },
    });
  });

  it("maps form values to API params", () => {
    expect(
      buildCreateIssueParams({
        repository: "owner/repo",
        title: "  Fix login  ",
        body: "  Details  ",
        labels: ["1", "not-a-number"],
        "label.priority": "2",
        assignees: [" alice ", ""],
        milestone: "3",
        dueDate: "2026-05-12T10:00:00.000Z",
      }),
    ).toEqual({
      owner: "owner",
      repo: "repo",
      title: "Fix login",
      body: "Details",
      labels: [1, 2],
      assignees: ["alice"],
      milestone: 3,
      due_date: "2026-05-12T10:00:00.000Z",
    });
  });

  it("combines regular and multiple exclusive labels while ignoring invalid label values", () => {
    expect(
      buildCreateIssueParams({
        repository: "owner/repo",
        title: "Fix labels",
        labels: ["1", "bad", "3"],
        "label.priority": "2",
        "label.kind": "not-a-number",
        "label.area": "",
      }),
    ).toMatchObject({
      labels: [1, 3, 2],
    });
  });

  it("omits optional fields when form values are blank", () => {
    expect(
      buildCreateIssueParams({
        repository: "owner/repo",
        title: "Fix",
        body: "   ",
        labels: [],
        assignees: [" ", ""],
        milestone: "",
      }),
    ).toEqual({
      owner: "owner",
      repo: "repo",
      title: "Fix",
      body: undefined,
      labels: undefined,
      milestone: undefined,
      assignees: undefined,
      due_date: undefined,
    });
  });

  it("returns error for invalid required fields", () => {
    expect(buildCreateIssueParams({ repository: "", title: "Fix" })).toEqual({
      error: "Repository is required",
    });
    expect(buildCreateIssueParams({ repository: "owner/repo", title: "   " })).toEqual({
      error: "Title is required",
    });
    expect(buildCreateIssueParams({ repository: "owner", title: "Fix" })).toEqual({
      error: "Invalid repository format",
    });
  });

  it("returns error for title exceeding 255 characters", () => {
    const longTitle = "a".repeat(256);
    expect(buildCreateIssueParams({ repository: "owner/repo", title: longTitle })).toEqual({
      error: "Title must be 255 characters or less",
    });
  });

  it("accepts title with exactly 255 characters", () => {
    const result = buildCreateIssueParams({
      repository: "owner/repo",
      title: "a".repeat(255),
    });
    expect(result).not.toHaveProperty("error");
    expect(result).toHaveProperty("owner", "owner");
  });
});

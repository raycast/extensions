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

  it("returns null for invalid required fields", () => {
    expect(buildCreateIssueParams({ repository: "", title: "Fix" })).toBeNull();
    expect(buildCreateIssueParams({ repository: "owner/repo", title: "   " })).toBeNull();
    expect(buildCreateIssueParams({ repository: "owner", title: "Fix" })).toBeNull();
  });
});

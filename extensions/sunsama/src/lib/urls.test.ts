import { describe, expect, it } from "vitest";
import { taskWebUrl, workspaceSlug } from "./urls";

describe("workspaceSlug", () => {
  it("reads the slug out of a full task URL", () => {
    expect(
      workspaceSlug("https://app.sunsama.com/group/devin_green?taid=abc123"),
    ).toBe("devin_green");
  });

  it("reads it out of a workspace URL, with or without a trailing slash", () => {
    expect(workspaceSlug("https://app.sunsama.com/group/devin_green")).toBe(
      "devin_green",
    );
    expect(workspaceSlug("https://app.sunsama.com/group/devin_green/")).toBe(
      "devin_green",
    );
  });

  it("accepts a bare slug", () => {
    expect(workspaceSlug("devin_green")).toBe("devin_green");
    expect(workspaceSlug("  devin_green  ")).toBe("devin_green");
  });

  it("returns null when there is nothing usable", () => {
    expect(workspaceSlug("")).toBeNull();
    expect(workspaceSlug(undefined)).toBeNull();
    expect(workspaceSlug("   ")).toBeNull();
    // A URL that isn't a workspace link has no slug to take.
    expect(workspaceSlug("https://app.sunsama.com/")).toBeNull();
  });
});

describe("taskWebUrl", () => {
  it("points at the task in its workspace", () => {
    expect(taskWebUrl("devin_green", "6a9197ae879635000195c73f")).toBe(
      "https://app.sunsama.com/group/devin_green?taid=6a9197ae879635000195c73f",
    );
  });
});

import { describe, expect, it } from "vitest";
import { taskUrl, taskWebUrl, workspaceSlug } from "./urls";

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

describe("taskUrl", () => {
  it("uses the web link by default", () => {
    expect(taskUrl("abc123", "devin_green", false)).toBe(
      "https://app.sunsama.com/group/devin_green?taid=abc123",
    );
  });

  it("has no web link without a workspace", () => {
    expect(taskUrl("abc123", null, false)).toBeUndefined();
  });

  it("uses the deep link when asked, workspace or not", () => {
    expect(taskUrl("abc123", null, true)).toBe(
      "sunsama://action/details/abc123",
    );
    expect(taskUrl("abc123", "devin_green", true)).toBe(
      "sunsama://action/details/abc123",
    );
  });
});

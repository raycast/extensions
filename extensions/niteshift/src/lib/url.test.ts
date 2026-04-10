import { describe, it, expect } from "vitest";
import { repoFullNameToSlug, buildTaskUrl } from "./url";

describe("repoFullNameToSlug", () => {
  it("replaces a single slash with double underscore", () => {
    expect(repoFullNameToSlug("owner/repo")).toBe("owner__repo");
  });

  it("preserves dashes and underscores in the original name", () => {
    expect(repoFullNameToSlug("my-org/my_repo")).toBe("my-org__my_repo");
  });

  it("returns an empty string for empty input", () => {
    expect(repoFullNameToSlug("")).toBe("");
  });
});

describe("buildTaskUrl", () => {
  it("builds a task URL with the slugged repo name", () => {
    expect(buildTaskUrl("https://niteshift.dev", "owner/repo", "task-123")).toBe(
      "https://niteshift.dev/repo/owner__repo/task-123",
    );
  });

  it("works with a trailing slash in the base URL", () => {
    expect(buildTaskUrl("https://niteshift.dev/", "owner/repo", "task-123")).toBe(
      "https://niteshift.dev/repo/owner__repo/task-123",
    );
  });

  it("works with a non-prod base URL", () => {
    expect(buildTaskUrl("https://stage.niteshift.dev", "acme/widgets", "abc")).toBe(
      "https://stage.niteshift.dev/repo/acme__widgets/abc",
    );
  });
});

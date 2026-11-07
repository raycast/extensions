import { describe, expect, it } from "vitest";
import {
  checkReferenceWorkspace,
  getReferenceWorkspaceProblem,
  parseWorkItemIdentifier,
  parseWorkItemReference,
} from "../src/helpers/identifiers";

describe("parseWorkItemReference", () => {
  it.each([
    ["ENG-123", "ENG", 123],
    ["eng-7", "ENG", 7],
    ["  WEB2-45 ", "WEB2", 45],
    ["Please look at ENG-12 today", "ENG", 12],
  ])("%s", (input, projectIdentifier, sequenceId) => {
    expect(parseWorkItemReference(input)).toStrictEqual({ type: "identifier", projectIdentifier, sequenceId });
  });

  it.each([
    ["https://app.plane.so/acme/browse/ENG-123/", "app.plane.so", "acme", "ENG", 123],
    ["https://tasks.example.net/acme/browse/OPS-9", "tasks.example.net", "acme", "OPS", 9],
    ["See https://plane.example.com:8443/plane/beta/browse/web-4 please", "plane.example.com:8443", "beta", "WEB", 4],
  ])("keeps the host and workspace of %s", (input, host, workspaceSlug, projectIdentifier, sequenceId) => {
    expect(parseWorkItemReference(input)).toStrictEqual({
      type: "identifier",
      projectIdentifier,
      sequenceId,
      host,
      workspaceSlug,
    });
  });

  it("parses project work item URLs with UUIDs", () => {
    const projectId = "5f0c5a5e-1c1d-4b1e-9a9a-0a0a0a0a0a0a";
    const workItemId = "7b0c5a5e-1c1d-4b1e-9a9a-0a0a0a0a0a0b";
    for (const segment of ["issues", "work-items"]) {
      expect(
        parseWorkItemReference(`https://app.plane.so/acme/projects/${projectId}/${segment}/${workItemId}`),
      ).toStrictEqual({
        type: "uuid",
        projectId,
        workItemId,
        host: "app.plane.so",
        workspaceSlug: "acme",
      });
    }
  });

  it.each(["", "hello world", "ENG-", "123", "ENG-0", "ABCDEFGHIJKLMN-1"])("rejects %j", (input) => {
    expect(parseWorkItemReference(input)).toBeUndefined();
  });

  it("parseWorkItemIdentifier ignores UUID URLs", () => {
    expect(
      parseWorkItemIdentifier(
        "https://app.plane.so/acme/projects/5f0c5a5e-1c1d-4b1e-9a9a-0a0a0a0a0a0a/issues/7b0c5a5e-1c1d-4b1e-9a9a-0a0a0a0a0a0b",
      ),
    ).toBeUndefined();
  });
});

describe("workspace of a pasted link", () => {
  const fromB = parseWorkItemReference("https://app.plane.so/team-b/browse/ENG-123")!;

  it("refuses a link from another workspace", () => {
    expect(getReferenceWorkspaceProblem(fromB, { workspaceSlug: "team-a" })).toBe(
      'This link is from workspace "team-b"; switch workspace first (current: "team-a").',
    );
    expect(checkReferenceWorkspace(fromB, "team-a")).toMatch(/^This link is from workspace "team-b"; switch workspace/);
  });

  it("accepts a link from the current workspace, and plain IDs anywhere", () => {
    expect(getReferenceWorkspaceProblem(fromB, { workspaceSlug: "TEAM-B" })).toBeUndefined();
    expect(checkReferenceWorkspace(fromB, "team-b")).toBeUndefined();
    expect(checkReferenceWorkspace(parseWorkItemReference("ENG-123")!, "team-a")).toBeUndefined();
  });

  it("refuses a link from another Plane server", () => {
    const selfHosted = parseWorkItemReference("https://plane.example.com/team-a/browse/ENG-1")!;
    // The test preferences point at app.plane.so and api.plane.so.
    expect(checkReferenceWorkspace(selfHosted, "team-a")).toMatch(/^This link is from plane\.example\.com, but/);
    expect(
      getReferenceWorkspaceProblem(selfHosted, { workspaceSlug: "team-a", knownHosts: ["plane.example.com"] }),
    ).toBeUndefined();
  });
});

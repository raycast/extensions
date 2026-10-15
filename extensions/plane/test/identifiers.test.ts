import { describe, expect, it } from "vitest";
import { parseWorkItemIdentifier, parseWorkItemReference } from "../src/helpers/identifiers";

describe("parseWorkItemReference", () => {
  it.each([
    ["ENG-123", "ENG", 123],
    ["eng-7", "ENG", 7],
    ["  WEB2-45 ", "WEB2", 45],
    ["Please look at ENG-12 today", "ENG", 12],
    ["https://app.plane.so/acme/browse/ENG-123/", "ENG", 123],
    ["https://tasks.example.net/acme/browse/OPS-9", "OPS", 9],
  ])("%s", (input, projectIdentifier, sequenceId) => {
    expect(parseWorkItemReference(input)).toEqual({ type: "identifier", projectIdentifier, sequenceId });
  });

  it("parses project work item URLs with UUIDs", () => {
    const projectId = "5f0c5a5e-1c1d-4b1e-9a9a-0a0a0a0a0a0a";
    const workItemId = "7b0c5a5e-1c1d-4b1e-9a9a-0a0a0a0a0a0b";
    for (const segment of ["issues", "work-items"]) {
      expect(
        parseWorkItemReference(`https://app.plane.so/acme/projects/${projectId}/${segment}/${workItemId}`),
      ).toEqual({
        type: "uuid",
        projectId,
        workItemId,
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

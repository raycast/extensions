import { describe, expect, it } from "@jest/globals";
import { buildFinderFileOperationScript, escapeAppleScriptString } from "../common/finder-file-operations";

describe("Finder file operations", () => {
  it("escapes quotes and backslashes in paths", () => {
    expect(escapeAppleScriptString('/tmp/a "quoted" \\ file')).toBe('/tmp/a \\"quoted\\" \\\\ file');
  });

  it("builds one Finder move command for the whole batch", () => {
    const script = buildFinderFileOperationScript("move", ["/tmp/a.txt", "/tmp/b.txt"], "/tmp/destination", false);

    expect(script).toContain(
      'set sourceItems to {(POSIX file "/tmp/a.txt") as alias, (POSIX file "/tmp/b.txt") as alias}',
    );
    expect(script).toContain("move sourceItems to destinationFolder replacing false");
  });

  it("uses Finder duplicate for copy operations", () => {
    const script = buildFinderFileOperationScript("copy", ["/tmp/a.txt"], "/tmp/destination", true);

    expect(script).toContain("duplicate sourceItems to destinationFolder replacing true");
  });

  it("rejects empty batches", () => {
    expect(() => buildFinderFileOperationScript("move", [], "/tmp/destination", false)).toThrow(
      "No source files provided",
    );
  });
});

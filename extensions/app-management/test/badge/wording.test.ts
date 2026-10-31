// Copied from badge-count-raycast test/wording.test.ts on 2026-09-30, unchanged except this header and the root path
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd(); // npm test runs from the repository root

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

// Word-boundary match: the identifier EXIT_DOCK_UNREADABLE is not the word "unread".
describe('wording audit (R10): no "unread"', () => {
  const files = walk(join(root, "src"));

  it("finds source files to audit", () => {
    assert.ok(files.length > 0);
  });

  for (const file of files) {
    it(`${file.slice(root.length)} does not contain "unread"`, () => {
      assert.ok(!/\bunread\b/i.test(readFileSync(file, "utf8")));
    });
  }

  it("package.json does not contain \"unread\"", () => {
    assert.ok(!/\bunread\b/i.test(readFileSync(join(root, "package.json"), "utf8")));
  });
});

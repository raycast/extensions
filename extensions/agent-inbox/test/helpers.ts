import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TestContext } from "node:test";

export function tempDir(t: TestContext): string {
  const dir = mkdtempSync(join(tmpdir(), "agent-inbox-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

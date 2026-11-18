import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

describe("formatting", () => {
  it("passes prettier --check across src, scripts, and the manifest", () => {
    const result = spawnSync(
      "npx",
      ["prettier", "--check", "src", "scripts", "package.json"],
      { cwd: ROOT, encoding: "utf8" },
    );
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    expect(output).not.toMatch(/Code style issues/);
    expect(result.status).toBe(0);
  });

  it("keeps PT_STOPWORDS compact and exempted", () => {
    // The array is deliberately 3 lines. Prettier would explode it to 25,
    // so it carries a statement-level ignore. If the ignore is dropped,
    // the check above fails; this asserts the intent is still recorded.
    const text = readFileSync(join(ROOT, "src", "api", "client.ts"), "utf8");
    expect(text).toMatch(/\/\/ prettier-ignore\s*\nconst PT_STOPWORDS/);
  });

  it("exempts sections.json by file, since JSON cannot carry comments", () => {
    const path = join(ROOT, ".prettierignore");
    expect(existsSync(path)).toBe(true);
    expect(readFileSync(path, "utf8")).toMatch(/^src\/sections\.json$/m);
  });
});

import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");

function sources(dir: string): string[] {
  return readdirSync(join(root, dir), { recursive: true })
    .map(String)
    .filter((f) => /\.(ts|tsx)$/.test(f))
    .map((f) => join(dir, f));
}

const ALLOWED = /^(@raycast\/api|@raycast\/utils|node:[a-z_/]+|react|react\/jsx-runtime|\.\.?\/.*)$/;

describe("ISC-9: no UI dependency beyond @raycast/api and @raycast/utils", () => {
  const files = [...sources("src"), ...sources("lib")];

  test("there is at least one source file to check", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    test(`${file} imports only allowed modules`, () => {
      const text = readFileSync(join(root, file), "utf8");
      // `… from "x"`, bare `import "x"`, dynamic `import("x")` and `require("x")`.
      const specifiers = [
        ...text.matchAll(/\b(?:from|import)\s+["']([^"']+)["']/g),
        ...text.matchAll(/\b(?:import|require)\s*\(\s*["'`]([^"'`]+)["'`]/g),
      ].map((m) => m[1]);
      const bad = specifiers.filter((s) => !ALLOWED.test(s));
      expect(bad).toEqual([]);
    });
  }
});

describe("lib/ stays free of @raycast imports (bun-testable)", () => {
  for (const file of sources("lib")) {
    test(`${file} has no @raycast import`, () => {
      expect(readFileSync(join(root, file), "utf8")).not.toMatch(/from\s+["']@raycast\//);
    });
  }
});

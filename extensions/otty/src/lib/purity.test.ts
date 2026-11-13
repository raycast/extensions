import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PURE_MODULES = [
  "otty-core.ts",
  "workspace.ts",
  "preview.ts",
  "settings.ts",
  "themes.ts",
  "paths.ts",
  "repos.ts",
  "concurrency.ts",
];

describe("pure modules", () => {
  it.each(PURE_MODULES)("%s never imports @raycast/api, so vitest can load it", (file) => {
    expect(readFileSync(join(__dirname, file), "utf8")).not.toMatch(/from\s+["']@raycast\//);
  });

  it("settings.ts has no relative imports, since the sync script runs it directly under Node", () => {
    expect(readFileSync(join(__dirname, "settings.ts"), "utf8")).not.toMatch(/from\s+["']\./);
  });
});

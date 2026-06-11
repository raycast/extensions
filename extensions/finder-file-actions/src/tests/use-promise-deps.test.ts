// static regression test for bug 1: inline callback in usePromise deps array
// causes infinite abort/restart loop because every render creates a new function
// reference. this test reads move-to-folder.tsx as text and looks for the
// anti-pattern inside the usePromise deps array.
//
// if this test fails, DO NOT silence it - read CLAUDE.md Gotchas section and
// understand why inline callbacks in usePromise deps are catastrophic here.

import { describe, it, expect } from "bun:test";
import path from "path";
import fs from "fs-extra";

describe("usePromise deps stability (bug 1 guard)", () => {
  it("move-to-folder.tsx usePromise deps array contains no inline arrow functions", async () => {
    const sourcePath = path.join(__dirname, "..", "move-to-folder.tsx");
    const source = await fs.readFile(sourcePath, "utf-8");

    // find the usePromise( call and extract the deps array (second argument)
    // shape: usePromise(searchSpotlight, [ ... ], { ... })
    const match = source.match(/usePromise\s*\(\s*searchSpotlight\s*,\s*\[([\s\S]*?)\]\s*,/);
    expect(match).not.toBeNull();
    const depsArraySource = match![1];

    // strip comments
    const stripped = depsArraySource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

    // anti-patterns: arrow function (=>) or `function` keyword inside the deps array
    expect(stripped).not.toContain("=>");
    expect(stripped).not.toMatch(/\bfunction\b/);
  });

  it("searchSpotlight function arity is 3 (search, scope, abortable) - no callback", async () => {
    // duplicate arity guard in case search-spotlight.test.ts is deleted
    const sourcePath = path.join(__dirname, "..", "common", "search-spotlight.tsx");
    const source = await fs.readFile(sourcePath, "utf-8");
    // locate the exported signature block
    const sigMatch = source.match(/export\s+const\s+searchSpotlight\s*=\s*\(([^)]*)\)/);
    expect(sigMatch).not.toBeNull();
    const params = sigMatch![1];
    // count top-level commas (params are simple - no nested generics between commas at top level in our case)
    // our signature: search: string, searchScope: string, abortable: ...
    // the only top-level commas separate the 3 params
    // strip trailing comma (prettier may add one) then count separators
    const trimmed = params.replace(/,\s*$/, "");
    const commas = (trimmed.match(/,/g) || []).length;
    expect(commas).toBe(2); // 3 params = 2 commas
  });
});

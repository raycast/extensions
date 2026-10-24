import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

// A second mock of a preloaded module replaces it for every later file in the process.
describe("only the preload mocks Raycast and React", () => {
  test("no test file calls .module() for @raycast/api, @raycast/utils or react", () => {
    const root = import.meta.dir;
    const owners = new Set(["preload.ts", "raycast-mock.ts"]);
    // Any quote style, and any name for bun:test's mock (`mock.module`, `m.module`, `vi.module`).
    const MOCKS = /\.module\(\s*["'`](@raycast\/api|@raycast\/utils|react)["'`]/;
    const files = readdirSync(root, { recursive: true, encoding: "utf8" }).filter((f) => /\.tsx?$/.test(f));
    expect(files.length).toBeGreaterThan(10); // the walk really found the test files
    const offenders = files
      .filter((f) => !owners.has(relative(root, join(root, f))))
      .filter((f) => MOCKS.test(readFileSync(join(root, f), "utf8")));
    expect(offenders).toEqual([]);
  });

  // mock.restore() doesn't undo a module mock either: a spy on node:fs in one file kept recording
  // every later file's calls. Any other module mock runs in a process of its own.
  test("no test file mocks any module in the test process; the env spy runs as its own process", () => {
    const root = import.meta.dir;
    const owners = new Set(["preload.ts", "raycast-mock.ts", "env-spy.flow.ts"]);
    // Any `<x>.module(...)` call in the code, whatever names the specifier (a literal, a const,
    // String(...)); read from the AST, so comments and strings don't count.
    const mocksAModule = (f: string) => {
      const sf = ts.createSourceFile(f, readFileSync(join(root, f), "utf8"), ts.ScriptTarget.Latest, true);
      let hit = false;
      const visit = (n: ts.Node) => {
        if (
          ts.isCallExpression(n) &&
          ts.isPropertyAccessExpression(n.expression) &&
          n.expression.name.text === "module"
        )
          hit = true;
        if (!hit) ts.forEachChild(n, visit);
      };
      visit(sf);
      return hit;
    };
    const files = readdirSync(root, { recursive: true, encoding: "utf8" }).filter((f) => /\.tsx?$/.test(f));
    expect(files.length).toBeGreaterThan(10);
    // Positive control: the owners really are found, so a clean result means something.
    expect(["preload.ts", "env-spy.flow.ts"].map(mocksAModule)).toEqual([true, true]);
    const offenders = files.filter((f) => !owners.has(relative(root, join(root, f))) && mocksAModule(f));
    expect(offenders).toEqual([]);
    // The flow is spawned, never imported (an import would install its mocks here), and isn't a test file.
    const importers = files.filter((f) => /from\s+["'`][^"'`]*env-spy\.flow/.test(readFileSync(join(root, f), "utf8")));
    expect(importers).toEqual([]);
    expect(files).toContain("env-spy.flow.ts");
    expect(files.filter((f) => /env-spy.*[._](test|spec)\.[jt]sx?$/.test(f))).toEqual([]);
  });
});

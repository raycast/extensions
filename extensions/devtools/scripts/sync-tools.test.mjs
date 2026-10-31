import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("..", import.meta.url));

test("sync handles spaces and formatting, and leaves all outputs intact on incomplete input", () => {
  const temporary = mkdtempSync(path.join(os.tmpdir(), "devtools sync "));
  try {
    const checkout = path.join(temporary, "checkout with spaces");
    const app = path.join(temporary, "app");
    mkdirSync(path.join(checkout, "src"), { recursive: true });
    mkdirSync(path.join(app, "src/app"), { recursive: true });
    cpSync(path.join(root, "scripts"), path.join(checkout, "scripts"), { recursive: true });
    symlinkSync(path.join(root, "node_modules"), path.join(checkout, "node_modules"));
    writeFileSync(path.join(checkout, "package.json"), JSON.stringify({ commands: [{ name: "search-tools" }] }));
    const registry = path.join(app, "src/app/toolRegistry.ts");
    const first = `{ icon: Icon, name: "First", id: "first", category: "Tools" }`;
    const second = `{ category: 'Tools', /* comment */ id: 'second', name: 'Second', icon: Icons.Second, keywords: ['a', 'b',], }`;
    const sync = () =>
      execFileSync(process.execPath, [path.join(checkout, "scripts/sync-tools.mjs"), app], {
        cwd: checkout,
        stdio: "pipe",
      });
    writeFileSync(registry, `export const ALL_TOOLS = [${first}, ${second},] as const;`);
    sync();
    assert.deepEqual(JSON.parse(readFileSync(path.join(checkout, "src/tools.json"))), [
      { id: "first", name: "First", category: "Tools", keywords: [] },
      { id: "second", name: "Second", category: "Tools", keywords: ["a", "b"] },
    ]);
    const files = ["src/tools.json", "package.json", "src/tool-first.ts", "src/tool-second.ts"];
    const before = files.map((file) => readFileSync(path.join(checkout, file), "utf8"));
    for (const invalid of ["...otherTools", "{ name: dynamicName, id: 'bad', category: 'Tools' }", first, "{"]) {
      writeFileSync(registry, `export const ALL_TOOLS = [${first}, ${invalid}];`);
      assert.throws(sync);
      assert.deepEqual(
        files.map((file) => readFileSync(path.join(checkout, file), "utf8")),
        before,
      );
    }
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

import assert from "node:assert/strict";
import { homedir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { finderPathInput, normalizeLocalPath } from "../src/path-input.ts";

test("a tilde opens the home directory", () => {
  assert.equal(normalizeLocalPath("~"), homedir());
});

test("a tilde-prefixed path expands from the home directory", () => {
  assert.equal(normalizeLocalPath("~/Downloads"), join(homedir(), "Downloads"));
});

test("a Finder path round-trips without trimming whitespace", () => {
  const path = "/tmp/ report ";
  assert.equal(normalizeLocalPath(finderPathInput(path)), path);
});

for (const path of ["/tmp/report ", "/tmp/ report", "/tmp/ report ", "~/Downloads/report "]) {
  test(`raw path preserves filename spaces: ${JSON.stringify(path)}`, () => {
    const expected = path.startsWith("~/") ? join(homedir(), path.slice(2)) : path;
    assert.equal(normalizeLocalPath(path), expected);
  });
}

test("blank input is rejected", () => {
  assert.throws(() => normalizeLocalPath("   "), /Enter one local path/);
});


test("handoff targets Salamander and preserves raw paths", async () => {
  const { readFile } = await import("node:fs/promises");
  const { runInNewContext } = await import("node:vm");
  const { transpileModule, ModuleKind } = await import("typescript");
  const source = await readFile(new URL("../src/salamander.ts", import.meta.url), "utf8");
  const calls = [];
  const exports = {};
  const api = {
    open: async (...args) => calls.push(args),
    showHUD: async () => {},
    getPreferenceValues: () => ({ pathTarget: "active" }),
  };
  runInNewContext(transpileModule(source, { compilerOptions: { module: ModuleKind.CommonJS } }).outputText, {
    exports, URL,
    require: (name) => name === "@raycast/api" ? api : { normalizeLocalPath },
  });
  await exports.send("open", exports.openFields(["/tmp/report "]));
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1], "ch.raciborski.swiftsalamander");
  assert.equal(new URL(calls[0][0]).searchParams.get("path"), "/tmp/report ");
});

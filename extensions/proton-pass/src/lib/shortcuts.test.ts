import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { platformShortcut } from "./shortcuts";

test("maps Command to Control on Windows", () => {
  assert.deepEqual(platformShortcut(["cmd"], "c"), {
    macOS: { modifiers: ["cmd"], key: "c" },
    Windows: { modifiers: ["ctrl"], key: "c" },
  });
});

test("maps Command-Option to Control-Alt on Windows", () => {
  assert.deepEqual(platformShortcut(["cmd", "opt"], "c"), {
    macOS: { modifiers: ["cmd", "opt"], key: "c" },
    Windows: { modifiers: ["ctrl", "alt"], key: "c" },
  });
});

test("preserves Shift in platform shortcuts", () => {
  assert.deepEqual(platformShortcut(["cmd", "shift"], "u"), {
    macOS: { modifiers: ["cmd", "shift"], key: "u" },
    Windows: { modifiers: ["ctrl", "shift"], key: "u" },
  });
});

test("TSX sources contain no macOS-only Command or Option shortcuts", () => {
  const sourceDir = join(process.cwd(), "src");
  const files = readdirSync(sourceDir, { recursive: true, encoding: "utf8" }).filter((file) => file.endsWith(".tsx"));
  const offenders = files.filter((file) =>
    /modifiers\s*:\s*\[\s*["'](?:cmd|opt)["']/.test(readFileSync(join(sourceDir, file), "utf8")),
  );

  assert.deepEqual(offenders, []);
});

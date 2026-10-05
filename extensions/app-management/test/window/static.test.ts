// Copied from raycast-window-switcher test/static.test.ts on 2026-09-30, unchanged except this header and the helper/ and model.ts paths
// A-9 static checks on the shipped sources.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const files = (d: string, ext: string): string[] =>
  readdirSync(join(root, d), { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(ext))
    .map((f) => join(root, d, f));

const ts = files("src", ".ts").concat(files("src", ".tsx"));
const swift = files("helper/window", ".swift");

test("A-9 no Raycast Pro WindowManagement API", () => {
  for (const f of ts) assert.ok(!/WindowManagement/.test(readFileSync(f, "utf8")), f);
});

test("A-9 no network modules or fetch in the extension", () => {
  for (const f of ts) {
    const s = readFileSync(f, "utf8");
    assert.ok(!/from "node:(http|https|net|dgram|tls)"|\bfetch\(/.test(s), f);
  }
});

test("A-9 helper never reads CGWindow titles (would need Screen Recording) and has no networking", () => {
  for (const f of swift) {
    const s = readFileSync(f, "utf8");
    assert.ok(!/kCGWindowName/.test(s), f);
    assert.ok(!/URLSession|NWConnection|CFSocket/.test(s), f);
  }
});

test("A-9 Desktop labels are never derived from window bounds", () => {
  const code = readFileSync(join(root, "src/lib/window/model.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  assert.ok(!/bounds|width|height|position/i.test(code));
});

test("helper identity is (pid, wid): focus never matches on titles", () => {
  const focus = readFileSync(join(root, "helper/window/Focus.swift"), "utf8");
  assert.ok(!/kAXTitleAttribute/.test(focus));
});

// Copied from raycast-window-switcher test/protocol.test.ts on 2026-09-30, unchanged except this header and import paths
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFocus, parseList, parseQuit } from "../../src/lib/window/protocol.ts";
import { win, app } from "./fixtures.ts";

const good = {
  schema: 1,
  ok: true,
  generatedAt: "x",
  elapsedMs: 5,
  accessibilityTrusted: true,
  spaces: { available: true, visibleSpaceIds: [1], displays: [] },
  apps: [app(1, "A")],
  windows: [win(1, 11, "One")],
  excluded: [{ pid: 1, wid: 12, reason: "subrole-AXFloatingWindow" }],
  warnings: [],
};

test("A-6 parses a valid list", () => {
  const r = parseList(JSON.stringify(good));
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.value.windows.length, 1);
    assert.equal(r.value.excludedCount, 1);
  }
});

test("A-6 rejects wrong schema", () => {
  const r = parseList(JSON.stringify({ ...good, schema: 2 }));
  assert.ok(!r.ok && r.failure.kind === "version-mismatch");
});

test("A-6 rejects non-JSON and non-array windows and malformed windows", () => {
  assert.ok(!parseList("not json").ok);
  const a = parseList(JSON.stringify({ ...good, windows: {} }));
  assert.ok(!a.ok && a.failure.kind === "bad-output");
  const b = parseList(JSON.stringify({ ...good, windows: [{ pid: 1, wid: "x" }] }));
  assert.ok(!b.ok && b.failure.kind === "bad-output");
});

test("A-8 maps not-trusted to its own failure", () => {
  const r = parseList(
    JSON.stringify({ schema: 1, ok: false, code: "not-trusted", message: "no", apps: [], windows: [] }),
  );
  assert.ok(!r.ok && r.failure.kind === "not-trusted");
});

test("focus response parsing", () => {
  const ok = parseFocus('{"schema":1,"ok":true,"focused":true,"tier":"public","attempts":[]}');
  assert.ok(ok.ok && ok.value.focused && ok.value.tier === "public");
  const gone = parseFocus('{"schema":1,"ok":false,"focused":false,"code":"window-gone","message":"gone"}');
  assert.ok(gone.ok && !gone.value.ok && gone.value.code === "window-gone");
  assert.ok(!parseFocus('{"schema":1}').ok);
});

test("quit response parsing", () => {
  const done = parseQuit('{"schema":1,"ok":true,"quit":true}');
  assert.ok(done.ok && done.value.quit);
  const pending = parseQuit('{"schema":1,"ok":true,"quit":false,"message":"Still running"}');
  assert.ok(pending.ok && pending.value.ok && !pending.value.quit);
  const gone = parseQuit('{"schema":1,"ok":false,"quit":false,"code":"app-gone"}');
  assert.ok(gone.ok && gone.value.code === "app-gone");
  assert.ok(!parseQuit('{"schema":1,"ok":true}').ok);
});

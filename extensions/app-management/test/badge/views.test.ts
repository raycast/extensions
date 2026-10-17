// Copied from badge-count-raycast test/views.test.ts on 2026-09-30, unchanged except this header, import paths, and the default filter (allApps) and three-way cycle assertions
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { rowState } from "../../src/lib/badge/badge.ts";
import type { DockApp, DockRead, RowState } from "../../src/lib/badge/badge.ts";
import type { SelectedApp } from "../../src/lib/badge/config.ts";
import { parseSelection, serializeSelection, STORAGE_KEY } from "../../src/lib/badge/config.ts";
import {
  DEFAULT_VIEW,
  emptyState,
  isBadged,
  loadPinsFrom,
  loadViewFrom,
  otherView,
  parsePins,
  parseView,
  PINS_STORAGE_KEY,
  prunePins,
  rowVisible,
  seedPins,
  serializePins,
  togglePin,
  VIEW_STORAGE_KEY,
} from "../../src/lib/badge/views.ts";
import type { KeyValueStore, ListView } from "../../src/lib/badge/views.ts";

function app(bundleId: string, name: string): SelectedApp {
  return { bundleId, path: `/Applications/${name}.app`, name };
}

const A = app("com.example.a", "Alpha");
const B = app("com.example.b", "Bravo");
const C = app("com.example.c", "Charlie");

/** In-memory LocalStorage stand-in that records every write. */
function memoryStore(initial: Record<string, unknown> = {}) {
  const data = new Map<string, unknown>(Object.entries(initial));
  const writes: Array<[string, string]> = [];
  const store: KeyValueStore = {
    async getItem(key) {
      return data.get(key);
    },
    async setItem(key, value) {
      writes.push([key, value]);
      data.set(key, value);
    },
  };
  return { store, data, writes };
}

const S = {
  numeric: { kind: "numeric", text: "3" },
  nonNumeric: { kind: "nonNumeric", text: "•" },
  zero: { kind: "zero", text: "0" },
  noBadge: { kind: "noBadge" },
  notInDock: { kind: "notInDock" },
  notInstalled: { kind: "notInstalled" },
  loading: { kind: "loading" },
  unavailable: { kind: "unavailable", reason: "Accessibility access is off for Raycast", failure: "permission" },
} satisfies Record<string, RowState>;

describe("isBadged (V4, V5)", () => {
  it("numeric and non-numeric Dock text count as badged", () => {
    for (const text of ["1", "42", "100"]) assert.equal(isBadged({ kind: "numeric", text }), true);
    for (const text of ["•", "!", "99+", "1,204", "New"]) assert.equal(isBadged({ kind: "nonNumeric", text }), true);
  });

  it("zero, no badge, not in Dock, not installed, loading and unavailable are not badged", () => {
    for (const key of ["zero", "noBadge", "notInDock", "notInstalled", "loading", "unavailable"] as const) {
      assert.equal(isBadged(S[key]), false, key);
    }
  });

  it("derives from real Dock values through the v1 rowState", () => {
    const mail = { bundleId: "com.apple.mail", path: "/System/Applications/Mail.app" };
    const read = (badge: string | null): DockRead => ({
      ok: true,
      apps: [{ bundleId: mail.bundleId, path: mail.path, title: "Mail", running: true, badge } satisfies DockApp],
    });
    assert.equal(isBadged(rowState(mail, true, read("2"))), true);
    assert.equal(isBadged(rowState(mail, true, read("•"))), true);
    assert.equal(isBadged(rowState(mail, true, read("0"))), false);
    assert.equal(isBadged(rowState(mail, true, read(null))), false);
    assert.equal(isBadged(rowState(mail, true, read(""))), false);
    assert.equal(isBadged(rowState(mail, true, { ok: true, apps: [] })), false);
  });
});

describe("rowVisible truth table (section 4, all 16 cases x 2 views)", () => {
  // [pinned, state, visible in Pinned + Badged, visible in Badged Only]
  const table: Array<[boolean, keyof typeof S, boolean, boolean]> = [
    [true, "numeric", true, true],
    [true, "nonNumeric", true, true],
    [true, "zero", true, false],
    [true, "noBadge", true, false],
    [true, "notInDock", true, false],
    [true, "notInstalled", true, false],
    [true, "loading", true, false],
    [true, "unavailable", true, false],
    [false, "numeric", true, true],
    [false, "nonNumeric", true, true],
    [false, "zero", false, false],
    [false, "noBadge", false, false],
    [false, "notInDock", false, false],
    [false, "notInstalled", false, false],
    [false, "loading", false, false],
    [false, "unavailable", true, false],
  ];
  for (const [pinned, key, pinnedAndBadged, badgedOnly] of table) {
    it(`${pinned ? "pinned" : "unpinned"} ${key}: P+B ${pinnedAndBadged}, BO ${badgedOnly}`, () => {
      assert.equal(rowVisible(S[key], pinned, "pinnedAndBadged"), pinnedAndBadged);
      assert.equal(rowVisible(S[key], pinned, "badgedOnly"), badgedOnly);
    });
  }

  it("covers every RowState kind", () => {
    assert.deepEqual(new Set(table.map(([, key]) => S[key].kind)).size, 8);
  });
});

describe("filtering keeps the configured order (V8)", () => {
  it("visible rows stay in selection order, pinned and unpinned interleaved", () => {
    const apps = [A, B, C, app("com.example.d", "Delta")];
    const states: RowState[] = [S.noBadge, S.numeric, S.noBadge, S.nonNumeric];
    const pins = ["com.example.c"];
    const visible = apps.filter((entry, i) => rowVisible(states[i], pins.includes(entry.bundleId), "pinnedAndBadged"));
    assert.deepEqual(
      visible.map((entry) => entry.name),
      ["Bravo", "Charlie", "Delta"],
    );
  });
});

describe("togglePin (V1)", () => {
  it("adds and removes without mutating", () => {
    const pins = [A.bundleId];
    assert.deepEqual(togglePin(pins, B.bundleId), [A.bundleId, B.bundleId]);
    assert.deepEqual(togglePin(pins, A.bundleId), []);
    assert.deepEqual(pins, [A.bundleId]);
  });
});

describe("prunePins (V15)", () => {
  it("drops pins of untracked apps and keeps order", () => {
    assert.deepEqual(prunePins([C.bundleId, "gone", A.bundleId], [A, B, C]), [C.bundleId, A.bundleId]);
  });
  it("a re-added app is unpinned after its pin was pruned", () => {
    const pruned = prunePins([A.bundleId, B.bundleId], [A]);
    assert.equal(pruned.includes(B.bundleId), false);
  });
});

describe("parsePins (V11)", () => {
  it("undefined is missing", () => {
    assert.deepEqual(parsePins(undefined), { status: "missing" });
  });
  it("non-string, invalid JSON, non-array and bad elements are corrupt", () => {
    for (const raw of [42, true, null, {}, [], "", "{no", '"x"', "null", '{"a":1}', "[1]", '[""]', "[null]", '["a",2]']) {
      assert.deepEqual(parsePins(raw), { status: "corrupt" }, JSON.stringify(raw));
    }
  });
  it("[] is a valid, deliberate empty pin list", () => {
    assert.deepEqual(parsePins("[]"), { status: "ok", pins: [] });
  });
  it("drops duplicates and round-trips through serializePins", () => {
    assert.deepEqual(parsePins('["a","b","a"]'), { status: "ok", pins: ["a", "b"] });
    assert.deepEqual(parsePins(serializePins(["x", "y"])), { status: "ok", pins: ["x", "y"] });
  });
});

describe("parseView and otherView", () => {
  it("defaults to All Apps for missing or unknown values (SPEC.md §5.3: unknown → allApps)", () => {
    assert.equal(DEFAULT_VIEW, "allApps");
    for (const raw of [undefined, null, "", "BadgedOnly", 1, true, "{}"]) assert.equal(parseView(raw), "allApps");
  });
  it("accepts all three stored values; the two old values keep their meaning", () => {
    assert.equal(parseView("badgedOnly"), "badgedOnly");
    assert.equal(parseView("pinnedAndBadged"), "pinnedAndBadged");
    assert.equal(parseView("allApps"), "allApps");
  });
  it("otherView cycles All Apps → Pinned + Badged → Badged Only → All Apps", () => {
    assert.equal(otherView("allApps"), "pinnedAndBadged");
    assert.equal(otherView("pinnedAndBadged"), "badgedOnly");
    assert.equal(otherView("badgedOnly"), "allApps");
  });
});

describe("seedPins", () => {
  it("pins every tracked app in tracked order", () => {
    assert.deepEqual(seedPins([C, A, B]), [C.bundleId, A.bundleId, B.bundleId]);
    assert.deepEqual(seedPins([]), []);
  });
});

describe("storage migration with isolated in-memory storage (V11)", () => {
  const selection = serializeSelection([A, B, C]);

  it("existing user, no pins key: pins all, writes once, notice seeded, selection untouched", async () => {
    const { store, data, writes } = memoryStore({ [STORAGE_KEY]: selection });
    const loaded = await loadPinsFrom(store, [A, B, C]);
    assert.deepEqual(loaded, { pins: [A.bundleId, B.bundleId, C.bundleId], notice: "seeded" });
    assert.deepEqual(writes, [[PINS_STORAGE_KEY, serializePins([A.bundleId, B.bundleId, C.bundleId])]]);
    assert.equal(data.get(STORAGE_KEY), selection);
    assert.deepEqual(parseSelection(data.get(STORAGE_KEY)), { status: "ok", apps: [A, B, C] });
  });

  it("second launch after seeding: no notice and no write", async () => {
    const { store, writes } = memoryStore({ [STORAGE_KEY]: selection });
    await loadPinsFrom(store, [A, B, C]);
    const again = await loadPinsFrom(store, [A, B, C]);
    assert.deepEqual(again, { pins: [A.bundleId, B.bundleId, C.bundleId] });
    assert.equal(writes.length, 1);
  });

  it("fresh install with an empty selection: saves [] silently", async () => {
    const { store, writes } = memoryStore();
    assert.deepEqual(await loadPinsFrom(store, []), { pins: [] });
    assert.deepEqual(writes, [[PINS_STORAGE_KEY, "[]"]]);
  });

  it("corrupt pins: all tracked pinned, notice reseeded-corrupt, never 'nothing pinned'", async () => {
    for (const bad of ["{not json", "42", '[1,"a"]', 7]) {
      const { store, data } = memoryStore({ [STORAGE_KEY]: selection, [PINS_STORAGE_KEY]: bad });
      const loaded = await loadPinsFrom(store, [A, B, C]);
      assert.deepEqual(loaded, { pins: [A.bundleId, B.bundleId, C.bundleId], notice: "reseeded-corrupt" });
      assert.equal(data.get(STORAGE_KEY), selection);
    }
  });

  it("deliberate [] stays empty: nothing is re-pinned", async () => {
    const { store, writes } = memoryStore({ [PINS_STORAGE_KEY]: "[]" });
    assert.deepEqual(await loadPinsFrom(store, [A, B]), { pins: [] });
    assert.equal(writes.length, 0);
  });

  it("stored pins are pruned to the selection on load without writing", async () => {
    const { store, writes } = memoryStore({ [PINS_STORAGE_KEY]: serializePins([B.bundleId, "gone"]) });
    assert.deepEqual(await loadPinsFrom(store, [A, B]), { pins: [B.bundleId] });
    assert.equal(writes.length, 0);
  });

  it("view: missing and unknown values give the default and never write", async () => {
    for (const initial of [{}, { [VIEW_STORAGE_KEY]: "nonsense" }]) {
      const { store, writes } = memoryStore(initial);
      assert.equal(await loadViewFrom(store), "allApps");
      assert.equal(writes.length, 0);
    }
    const { store } = memoryStore({ [VIEW_STORAGE_KEY]: "badgedOnly" });
    assert.equal(await loadViewFrom(store), "badgedOnly");
  });
});

describe("emptyState (V12, V13)", () => {
  const ok: DockRead = { ok: true, apps: [] };
  const failed: DockRead = { ok: false, failure: "permission", reason: "r", diagnostic: "d" };
  // emptyState is the badge project's; All Apps has its own empty rules in src/lib/rows.ts.
  const views: ListView[] = ["pinnedAndBadged", "badgedOnly"];

  it("no empty view while the selection loads or rows are visible", () => {
    for (const view of views) {
      assert.equal(emptyState(view, undefined, 0, ok), undefined);
      assert.equal(emptyState(view, 3, 1, failed), undefined);
    }
  });

  it("no tracked apps wins", () => {
    for (const view of views) assert.equal(emptyState(view, 0, 0, failed), "noApps");
  });

  it("read in progress", () => {
    for (const view of views) assert.equal(emptyState(view, 3, 0, undefined), "reading");
  });

  it("a failed read is never reported as 'nothing badged'", () => {
    for (const view of views) assert.equal(emptyState(view, 3, 0, failed), "failed");
  });

  it("successful read with nothing visible", () => {
    assert.equal(emptyState("badgedOnly", 3, 0, ok), "noneBadged");
    assert.equal(emptyState("pinnedAndBadged", 3, 0, ok), "nonePinnedOrBadged");
  });

  it("Badged Only with a failed read has no visible rows, so it always reaches the failure view", () => {
    // With a failed read, rowState gives every app "unavailable" (or "notInstalled"), pinned or not.
    for (const pinned of [true, false]) {
      for (const installed of [true, false]) {
        const state = rowState({ bundleId: "x", path: "/x" }, installed, failed);
        assert.equal(rowVisible(state, pinned, "badgedOnly"), false);
      }
    }
    assert.equal(emptyState("badgedOnly", 7, 0, failed), "failed");
  });
});

describe("no work while the view is closed (V14, static)", () => {
  const root = process.cwd(); // npm test runs from the repository root
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
    );

  it("src/ has no timers", () => {
    for (const file of walk(join(root, "src"))) {
      assert.ok(!/\bset(Interval|Timeout)\s*\(/.test(readFileSync(file, "utf8")), file);
    }
  });

  it("the manifest still has no interval and no menu-bar command", () => {
    const manifest = readFileSync(join(root, "package.json"), "utf8");
    assert.ok(!/"interval"/.test(manifest));
    assert.ok(!/"menu-bar"/.test(manifest));
  });
});

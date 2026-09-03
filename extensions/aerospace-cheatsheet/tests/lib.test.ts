import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { keyDisplay, keySearchTerms, parseKey } from "../src/lib/keys";
import { buildRows, type Row } from "../src/lib/rows";
import { lookup, normalize } from "../src/lib/dictionary";
import { RECIPES, resolveRecipe } from "../src/lib/recipes";
import { rowMarkdown } from "../src/lib/detail";
import { tokenise } from "../src/lib/config";
import { isServerDisabled } from "../src/serverState";
import { toPlacement } from "../src/lib/workspaces";
import type { Binding } from "../src/lib/config";

const THIN = " ";

function bind(mode: string, map: Record<string, string>): Binding[] {
  return Object.entries(map).map(([key, command]) => ({
    mode,
    key,
    command,
    commands: command.split("; ").map((c) => c.trim()),
  }));
}

/** Text a user can actually see. Anything here must never contain a raw placeholder. */
function visibleStrings(rows: Row[]): string[] {
  return rows.flatMap((r) => [
    r.title,
    r.command,
    r.blurb ?? "",
    r.teaches ?? "",
    ...r.keys.map((k) => k.display),
    rowMarkdown(r),
  ]);
}

describe("keys", () => {
  it("renders modifiers in macOS canonical order regardless of config order", () => {
    assert.equal(parseKey("cmd-shift-alt-ctrl-a").display, ["⌃", "⌥", "⇧", "⌘", "A"].join(THIN));
    assert.equal(parseKey("alt-ctrl-a").display, parseKey("ctrl-alt-a").display);
  });

  it("separates glyphs with a thin space, not a regular space", () => {
    const d = parseKey("ctrl-alt-cmd-l").display;
    assert.ok(d.includes(THIN), "expected U+2009 between glyphs");
    assert.ok(!d.includes(" "), "expected no ordinary space");
  });

  it("maps AeroSpace's spelled-out key names to glyphs", () => {
    const cases: [string, string][] = [
      ["ctrl-alt-leftSquareBracket", "["],
      ["ctrl-alt-minus", "−"],
      ["ctrl-alt-equal", "="],
      ["ctrl-alt-enter", "↩"],
      ["ctrl-alt-space", "␣"],
      ["esc", "⎋"],
      ["backspace", "⌫"],
      ["ctrl-alt-right", "→"],
    ];
    for (const [raw, glyph] of cases) {
      assert.ok(parseKey(raw).display.endsWith(glyph), `${raw} should end with ${glyph}`);
    }
  });

  it("uppercases single letters but leaves multi-character key names readable", () => {
    assert.equal(parseKey("a").display, "A");
    // AeroSpace supports f1-f20 and keypad keys; they should not render lowercase.
    assert.equal(parseKey("f1").display, "F1");
    assert.equal(parseKey("ctrl-f13").display, `⌃${THIN}F13`);
  });

  it("survives malformed key strings without throwing", () => {
    for (const raw of ["", "-", "ctrl-", "-alt-l", "ctrl--alt-l", "ctrl-alt", "🙂"]) {
      assert.doesNotThrow(() => parseKey(raw), `threw on ${JSON.stringify(raw)}`);
      assert.equal(typeof keyDisplay(raw), "string");
    }
  });

  it("emits unspaced search terms so typing ctrl-alt-cmd-l still matches", () => {
    const terms = keySearchTerms("ctrl-alt-cmd-l");
    assert.ok(terms.includes("ctrl-alt-cmd-l"));
    assert.ok(terms.includes("ctrlaltcmdl"));
    assert.ok(terms.some((t) => t === "⌃⌥⌘L"));
  });
});

describe("dictionary", () => {
  it("normalizes whitespace before matching", () => {
    assert.ok(lookup("layout   --root  h_tiles"));
    assert.equal(normalize("  focus   left  "), "focus left");
  });

  it("returns undefined for an unknown command rather than throwing", () => {
    assert.equal(lookup("some-future-command --with flags"), undefined);
  });

  it("does not crash on commands containing regex metacharacters", () => {
    for (const c of ["focus (left", "a[b", "x{2,}", "back\\slash", "new\nline"]) {
      assert.doesNotThrow(() => lookup(c));
    }
  });
});

describe("rows — invariants", () => {
  const config = bind("main", {
    "ctrl-alt-left": "focus left",
    "ctrl-alt-h": "focus left",
    "ctrl-alt-right": "focus right",
    "ctrl-alt-cmd-l": "join-with right",
    "ctrl-alt-minus": "resize smart -50",
    "ctrl-alt-equal": "resize smart +50",
    ...Object.fromEntries([1, 2, 3].map((n) => [`ctrl-alt-${n}`, `workspace ${n}`])),
  });

  it("loses no bindings", () => {
    const rows = buildRows(config);
    const kept = rows.flatMap((r) => r.bindings);
    assert.equal(kept.length, config.length, "binding count changed");
    assert.equal(new Set(kept.map((b) => `${b.mode} ${b.key}`)).size, config.length, "a binding was duplicated");
  });

  it("gives every row a unique id", () => {
    const rows = buildRows(config);
    assert.equal(new Set(rows.map((r) => r.id)).size, rows.length);
  });

  it("is deterministic", () => {
    assert.deepEqual(
      buildRows(config).map((r) => `${r.id}|${r.title}|${r.keys.map((k) => k.display).join()}`),
      buildRows(config).map((r) => `${r.id}|${r.title}|${r.keys.map((k) => k.display).join()}`),
    );
  });

  it("never leaks a raw $1 placeholder into anything a user reads", () => {
    for (const text of visibleStrings(buildRows(config))) {
      assert.ok(!/\$\d/.test(text), `placeholder leaked: ${text}`);
    }
  });

  it("never renders undefined, null or NaN into visible text", () => {
    for (const text of visibleStrings(buildRows(config))) {
      assert.ok(!/\b(undefined|null|NaN)\b/.test(text), `bad value rendered: ${text}`);
    }
  });

  it("handles an empty config", () => {
    assert.deepEqual(buildRows([]), []);
  });
});

describe("rows — merge rules", () => {
  it("collapses arrows and hjkl into one row with the arrow leading", () => {
    const rows = buildRows(bind("main", { "ctrl-alt-left": "focus left", "ctrl-alt-h": "focus left" }));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].keys.length, 2);
    assert.equal(rows[0].keys[0].alternate, false);
    assert.ok(rows[0].keys[0].display.endsWith("←"), "arrow should lead");
    assert.equal(rows[0].keys[1].alternate, true);
  });

  it("folds a mirrored pair, negative first", () => {
    const rows = buildRows(bind("main", { "ctrl-alt-equal": "resize width +50", "ctrl-alt-minus": "resize width -50" }));
    assert.equal(rows.length, 1);
    assert.match(rows[0].title, /−50 \/ \+50/);
  });

  it("folds a numeric run into a range using the config's own bounds", () => {
    const rows = buildRows(bind("main", Object.fromEntries([1, 2, 3, 4, 5].map((n) => [`alt-${n}`, `workspace ${n}`]))));
    assert.equal(rows.length, 1);
    assert.match(rows[0].title, /1–5/);
    assert.match(rows[0].keys[0].display, /1–5/);
  });

  it("keeps the four directions as separate rows", () => {
    const rows = buildRows(
      bind("main", {
        "alt-h": "focus left",
        "alt-j": "focus down",
        "alt-k": "focus up",
        "alt-l": "focus right",
      }),
    );
    assert.equal(rows.length, 4);
  });

  it("does NOT drop a third member of a pair-collapse cluster", () => {
    // A user can bind more than two resize steps. Nothing may vanish.
    const config = bind("main", {
      "alt-minus": "resize width -50",
      "alt-equal": "resize width +50",
      "alt-shift-minus": "resize width -100",
    });
    const kept = buildRows(config).flatMap((r) => r.bindings);
    assert.equal(kept.length, 3, "a binding was dropped from a 3-member cluster");
  });

  it("does not produce a dangling separator when two entries share a label", () => {
    // Both spellings capture "prev", so both interpolate to the same label.
    const rows = buildRows(
      bind("main", {
        "alt-1": "move-node-to-monitor prev",
        "alt-2": "move-node-to-monitor --wrap-around prev",
      }),
    );
    for (const r of rows) {
      assert.ok(!/\/\s*$/.test(r.title), `title ends with a dangling separator: ${r.title}`);
      assert.ok(!/\s\/\s\//.test(r.title), `doubled separator: ${r.title}`);
    }
  });

  it("files non-main-mode bindings under service, matching on the real command", () => {
    const rows = buildRows(bind("service", { "ctrl-alt-shift-h": "join-with left; mode main" }));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].group, "service", "service-mode binding was misfiled");
    assert.notEqual(rows[0].title, "join-with left; mode main", "the mode switch was not stripped before lookup");
  });

  it("only claims a range when the series is actually contiguous", () => {
    const gappy = buildRows(bind("main", Object.fromEntries([1, 3, 7].map((n) => [`alt-${n}`, `workspace ${n}`]))));
    assert.equal(gappy.length, 1);
    assert.ok(!/1–7/.test(gappy[0].title), `claimed a range it does not have: ${gappy[0].title}`);
    assert.match(gappy[0].title, /1, 3, 7/);
    assert.ok(!/–/.test(gappy[0].keys[0].display), `key chip claims a range: ${gappy[0].keys[0].display}`);

    const solid = buildRows(bind("main", Object.fromEntries([1, 2, 3].map((n) => [`alt-${n}`, `workspace ${n}`]))));
    assert.match(solid[0].title, /1–3/, "a contiguous run should still fold to a range");
  });

  it("truncates a long gappy series with a count instead of a false range", () => {
    const odds = [1, 3, 5, 7, 9, 11, 13];
    const rows = buildRows(bind("main", Object.fromEntries(odds.map((n) => [`alt-w${n}`, `workspace ${n}`]))));
    assert.equal(rows.flatMap((r) => r.bindings).length, odds.length);
    assert.match(rows[0].title, /\+\d/, `expected a truncated count, got: ${rows[0].title}`);
    assert.ok(!/1–13/.test(rows[0].title));
  });

  it("merges cluster members that share a label into one row, keeping every key", () => {
    // Both spellings of prev, and both of next: four bindings, one honest row.
    const rows = buildRows(
      bind("main", {
        "alt-p": "move-node-to-monitor prev",
        "alt-n": "move-node-to-monitor next",
        "alt-shift-p": "move-node-to-monitor --wrap-around prev",
        "alt-shift-n": "move-node-to-monitor --wrap-around next",
      }),
    );
    assert.equal(rows.flatMap((r) => r.bindings).length, 4, "a binding was dropped");
    assert.equal(rows.length, 1, "same-label members should not appear as duplicate rows");
    assert.equal(rows[0].keys.length, 4);
    assert.equal(new Set(rows.map((r) => r.title)).size, rows.length, "duplicate row titles");
  });

  it("recognizes every direction move-node-to-monitor accepts", () => {
    const rows = buildRows(
      bind("main", {
        "alt-1": "move-node-to-monitor left",
        "alt-2": "move-node-to-monitor right",
        "alt-3": "move-node-to-monitor up",
        "alt-4": "move-node-to-monitor down",
      }),
    );
    assert.equal(rows.flatMap((r) => r.bindings).length, 4);
    for (const r of rows) {
      assert.notEqual(r.group, "other", `directional monitor move fell through: ${r.title}`);
      assert.ok(!/move-node-to-monitor/.test(r.title), `raw command shown as title: ${r.title}`);
    }
  });

  it("puts an unknown command in Other rather than dropping it", () => {
    const rows = buildRows(bind("main", { "alt-z": "some-future-command --flag" }));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].group, "other");
    assert.equal(rows[0].title, "some-future-command --flag");
  });

  it("handles non-numeric workspace names", () => {
    const rows = buildRows(bind("main", { "alt-a": "workspace web", "alt-b": "workspace chat" }));
    const kept = rows.flatMap((r) => r.bindings);
    assert.equal(kept.length, 2);
    for (const text of visibleStrings(rows)) assert.ok(!/\$\d/.test(text));
  });

  it("stays fast on a large config", () => {
    const big = bind(
      "main",
      Object.fromEntries(Array.from({ length: 2000 }, (_, i) => [`alt-key${i}`, `workspace ws${i}`])),
    );
    const started = Date.now();
    const rows = buildRows(big);
    const elapsed = Date.now() - started;
    assert.equal(rows.flatMap((r) => r.bindings).length, 2000);
    assert.ok(elapsed < 3000, `buildRows took ${elapsed}ms on 2000 bindings`);
  });
});

describe("command tokenising", () => {
  it("splits a plain command on whitespace", () => {
    assert.deepEqual(tokenise("layout --root h_tiles"), ["layout", "--root", "h_tiles"]);
    assert.deepEqual(tokenise("  focus   left  "), ["focus", "left"]);
  });

  it("keeps a quoted argument together", () => {
    // Workspace names may contain spaces; a plain split produced four broken args.
    assert.deepEqual(tokenise('move-node-to-workspace -- "Design Work"'), [
      "move-node-to-workspace",
      "--",
      "Design Work",
    ]);
    assert.deepEqual(tokenise("workspace 'my space'"), ["workspace", "my space"]);
  });

  it("preserves a deliberately empty quoted argument", () => {
    assert.deepEqual(tokenise('cmd "" x'), ["cmd", "", "x"]);
  });

  it("returns nothing for an empty or whitespace-only command", () => {
    assert.deepEqual(tokenise(""), []);
    assert.deepEqual(tokenise("   "), []);
  });
});

describe("server state detection", () => {
  it("recognizes AeroSpace's disabled-server message", () => {
    // Verified against the real CLI: this is the exact wording it returns.
    const real = new Error(
      "Command failed: aerospace list-workspaces\nAeroSpace server is disabled and doesn't accept commands. You can use 'aerospace enable on' to enable the server",
    );
    assert.equal(isServerDisabled(real), true);
  });

  it("does not mistake an ordinary failure for a disabled server", () => {
    assert.equal(isServerDisabled(new Error("spawn aerospace ENOENT")), false);
    assert.equal(isServerDisabled(new Error("No AeroSpace config found")), false);
    assert.equal(isServerDisabled(undefined), false);
    assert.equal(isServerDisabled(null), false);
  });
});

describe("values crossing the cached-promise boundary", () => {
  // useCachedPromise persists its result as JSON. A Map does not survive that: it
  // comes back as {} with no .get, so the command worked on its first run against
  // live data and threw on every cached run afterwards.
  it("returns workspace placement as a plain JSON-safe object", () => {
    const placement = toPlacement([
      ["1", 1],
      ["10", 2],
    ]);
    assert.equal(Object.getPrototypeOf(placement), Object.prototype, "not a plain object");
    assert.deepEqual(placement, { "1": 1, "10": 2 });
  });

  it("survives a JSON round trip unchanged", () => {
    const placement = toPlacement([
      ["1", 1],
      ["10", 2],
    ]);
    const revived = JSON.parse(JSON.stringify(placement));
    assert.deepEqual(revived, placement, "the cached copy differs from the live one");
    assert.equal(revived["10"], 2, "lookup broke after serialization");
  });

  it("would have caught a Map", () => {
    const asMap = new Map([["10", 2]]);
    assert.notDeepEqual(JSON.parse(JSON.stringify(asMap)), Object.fromEntries(asMap));
  });
});

describe("bring-workspace candidate filter", () => {
  // Mirrors the filter in bringWorkspaceHere.tsx. A monitor shows one workspace at a
  // time, so bringing an EMPTY one over hides whatever you were looking at and makes
  // AeroSpace auto-create a replacement on the display it left. Observed on a real
  // two-display setup: the only offered candidate was empty, and pressing it made the
  // user's windows disappear.
  type W = { name: string; isEmpty: boolean };
  const candidates = (workspaces: W[], placement: Record<string, number>, hereId: number) =>
    workspaces.filter(
      (w) => !w.isEmpty && placement[w.name] !== undefined && placement[w.name] !== hereId,
    );

  it("never offers an empty workspace", () => {
    const got = candidates([{ name: "10", isEmpty: true }], { "10": 2 }, 1);
    assert.deepEqual(got, [], "an empty workspace was offered");
  });

  it("offers a populated workspace on another display", () => {
    const got = candidates([{ name: "3", isEmpty: false }], { "3": 2 }, 1);
    assert.equal(got.length, 1);
  });

  it("never offers a workspace already on this display", () => {
    const got = candidates([{ name: "3", isEmpty: false }], { "3": 1 }, 1);
    assert.deepEqual(got, []);
  });

  it("offers nothing when the other display holds only empties", () => {
    const workspaces = [
      { name: "1", isEmpty: false },
      { name: "10", isEmpty: true },
      { name: "11", isEmpty: true },
    ];
    assert.deepEqual(candidates(workspaces, { "1": 1, "10": 2, "11": 2 }, 1), []);
  });
});

describe("recipes", () => {
  const full = bind("main", {
    "ctrl-alt-c": "layout --root h_tiles",
    "ctrl-alt-cmd-l": "join-with right",
    "ctrl-alt-shift-left": "move left",
    "ctrl-alt-shift-h": "move left",
    "ctrl-alt-f": "flatten-workspace-tree",
    "ctrl-alt-b": "balance-sizes",
  });

  it("resolves every step against a complete config", () => {
    for (const recipe of RECIPES) {
      const r = resolveRecipe(recipe, full);
      assert.deepEqual(r.missing, [], `${recipe.title} reported missing commands`);
      for (const step of r.resolved) {
        if (step.command) assert.ok(step.keys, `${recipe.title}: no key resolved for ${step.command}`);
      }
    }
  });

  it("prefers the arrow spelling, matching what the list rows show", () => {
    const r = resolveRecipe(RECIPES[0], full);
    const moveStep = r.resolved.find((s) => s.command === "move left");
    assert.ok(moveStep?.keys?.endsWith("←"), `expected the arrow variant, got ${moveStep?.keys}`);
  });

  it("reports missing commands instead of inventing a key", () => {
    const partial = bind("main", { "ctrl-alt-c": "layout --root h_tiles" });
    const r = resolveRecipe(RECIPES[0], partial);
    assert.ok(r.missing.length > 0);
    for (const step of r.resolved) {
      if (step.unbound) assert.equal(step.keys, undefined, "an unbound step still produced a key");
    }
  });

  it("does not list the same missing command twice", () => {
    const r = resolveRecipe(RECIPES[1], bind("main", {}));
    assert.equal(new Set(r.missing).size, r.missing.length, "missing list contains duplicates");
  });

  it("falls back to a non-main mode when that is the only binding", () => {
    const serviceOnly = bind("service", { "h": "join-with right; mode main" });
    const r = resolveRecipe(RECIPES[0], serviceOnly);
    const joinStep = r.resolved.find((s) => s.command === "join-with right");
    assert.ok(joinStep?.keys, "should still resolve from a non-main mode");
  });
});

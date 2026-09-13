import assert from "node:assert/strict";
import { test } from "node:test";
import {
  COLUMN_EM,
  COLUMN_TOLERANCE_EM,
  emWidth,
  fitPath,
  fitWidth,
  HEADER_CHARS,
  headerPathChars,
  padTimeColumn,
  PROJECT_EM,
  relativeTime,
  snippet,
} from "../src/lib/format";

const NOW = 1_700_000_000_000;
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/** `now` is injected so these assertions do not depend on the wall clock. */
function ago(delta: number): string {
  return relativeTime(NOW - delta, NOW);
}

test("anything under a minute old reads as now", () => {
  assert.equal(ago(0), "now");
  assert.equal(ago(1), "now");
  assert.equal(ago(MINUTE - 1), "now");
});

test("a timestamp in the future still reads as now", () => {
  assert.equal(relativeTime(NOW + DAY, NOW), "now");
  assert.equal(relativeTime(NOW + 52 * WEEK, NOW), "now");
});

test("minutes run from one minute up to an hour", () => {
  assert.equal(ago(MINUTE), "1m");
  assert.equal(ago(90_000), "1m");
  assert.equal(ago(59 * MINUTE), "59m");
  assert.equal(ago(HOUR - 1), "59m");
});

test("hours run from one hour up to a day", () => {
  assert.equal(ago(HOUR), "1h");
  assert.equal(ago(23 * HOUR), "23h");
  assert.equal(ago(DAY - 1), "23h");
});

test("days run from one day up to a week", () => {
  assert.equal(ago(DAY), "1d");
  assert.equal(ago(6 * DAY), "6d");
  assert.equal(ago(WEEK - 1), "6d");
});

test("weeks run from one week up to a year", () => {
  assert.equal(ago(WEEK), "1w");
  assert.equal(ago(51 * WEEK), "51w");
  assert.equal(ago(52 * WEEK - 1), "51w");
});

test("a year or more reads in years", () => {
  assert.equal(ago(52 * WEEK), "1y");
  assert.equal(ago(104 * WEEK), "2y");
});

test("years stop at two digits, so no stamp outgrows the column", () => {
  assert.equal(ago(99 * 52 * WEEK), "99y");
  assert.equal(ago(100 * 52 * WEEK), "99y");
  // A negative mtime is the way a garbage stat value reaches three digits.
  assert.equal(relativeTime(-200 * 52 * WEEK, NOW), "99y");
});

const LEAD = 10;
const LENGTH = 220;

test("a short line with a match is returned whole, without ellipses", () => {
  assert.equal(snippet("hello world", ["world"]), "hello world");
});

test("a short line with no match is returned whole", () => {
  assert.equal(snippet("hello world", ["absent"]), "hello world");
  assert.equal(snippet("hello world", []), "hello world");
});

test("an empty line stays empty", () => {
  assert.equal(snippet("", ["anything"]), "");
});

test("the window is centred on the first matched word", () => {
  const text = `${"a".repeat(100)} needle tail`;
  const at = text.indexOf("needle");
  const out = snippet(text, ["needle"]);
  assert.equal(out, text.slice(at - LEAD));
  assert.ok(out.includes("needle"));
});

// The column draws about forty characters, so a lead anywhere near that many
// puts the match past the cut.
test("the match lands inside the width the subtitle actually draws", () => {
  const text = `${"a".repeat(500)} needle ${"b".repeat(500)}`;
  assert.ok(snippet(text, ["needle"]).indexOf("needle") < 20);
});

test("a cut landing mid-word opens on the next whole word instead", () => {
  const text = `${"a".repeat(50)} wonder ish needle tail`;
  assert.equal(snippet(text, ["needle"]), "ish needle tail");
});

test("a cut already on a word boundary keeps the whole lead", () => {
  const text = `${"a".repeat(50)} wonderful needle tail`;
  assert.equal(snippet(text, ["needle"]), "wonderful needle tail");
});

// Dropping to the next boundary here would drop the lead outright, since the
// only boundary in it is the match's own.
test("a lead of one unbroken token is kept, mid-token cut and all", () => {
  const text = `${"x".repeat(30)} /Users/aki/code/needle/main.ts done`;
  assert.equal(snippet(text, ["needle"]), "/aki/code/needle/main.ts done");
});

test("no space is left standing at either cut", () => {
  // Padding wide enough to swallow the lead, so the window opens inside it, and
  // wide enough again to run past the tail cut.
  const text = `${"a".repeat(20)}${" ".repeat(12)}needle${" ".repeat(LENGTH)}tail`;
  const out = snippet(text, ["needle"]);
  assert.equal(out, "needle…");
});

test("a line that fits keeps the whitespace it came with", () => {
  assert.equal(snippet("  hello world  ", ["hello"]), "  hello world  ");
});

test("the front is never marked, cut or not", () => {
  const whole = `${"a".repeat(LEAD)}needle tail`;
  assert.equal(whole.indexOf("needle"), LEAD);
  assert.equal(snippet(whole, ["needle"]), whole);

  const cut = `${"a".repeat(100)} lead needle tail`;
  assert.equal(snippet(cut, ["needle"]), "lead needle tail");
});

test("a trailing ellipsis appears only when the tail is cut off", () => {
  const text = `needle ${"b".repeat(500)}`;
  const out = snippet(text, ["needle"]);
  assert.ok(!out.startsWith("…"));
  assert.ok(out.endsWith("…"));
  assert.equal(out, `${text.slice(0, LENGTH)}…`);
});

test("no trailing ellipsis when the window reaches the end", () => {
  const text = `needle ${"b".repeat(LENGTH - 7)}`;
  assert.equal(text.length, LENGTH);
  assert.equal(snippet(text, ["needle"]), text);
});

test("a window cut on both sides is marked on the tail only", () => {
  const text = `${"a".repeat(300)} needle ${"b".repeat(300)}`;
  const out = snippet(text, ["needle"]);
  assert.ok(!out.startsWith("…"));
  assert.ok(out.endsWith("…"));
  assert.ok(out.includes("needle"));
  assert.equal(out.length, LENGTH + 1);
});

test("the earliest matching word wins, whatever the query order", () => {
  const text = `${"a".repeat(100)} alpha ${"b".repeat(200)} beta`;
  const at = text.indexOf("alpha");
  assert.equal(
    snippet(text, ["beta", "alpha"]),
    snippet(text, ["alpha", "beta"]),
  );
  assert.ok(
    snippet(text, ["beta", "alpha"]).startsWith(text.slice(at - LEAD, at)),
  );
});

test("a word absent from the line is skipped when centring", () => {
  const text = `${"a".repeat(100)} needle tail`;
  const at = text.indexOf("needle");
  assert.equal(snippet(text, ["absent", "needle"]), text.slice(at - LEAD));
});

test("no match falls back to the start of the line", () => {
  const text = "z".repeat(400);
  const out = snippet(text, ["absent"]);
  assert.equal(out, `${text.slice(0, LENGTH)}…`);
});

/** Every distinct string relativeTime can produce, across all six branches. */
function everyStamp(): string[] {
  const out = new Set<string>(["now"]);
  for (let i = 1; i < 60; i++) out.add(ago(i * MINUTE));
  for (let i = 1; i < 24; i++) out.add(ago(i * HOUR));
  for (let i = 1; i < 7; i++) out.add(ago(i * DAY));
  for (let i = 1; i < 52; i++) out.add(ago(i * WEEK));
  for (let i = 1; i < 120; i++) out.add(ago(i * 52 * WEEK));
  return [...out];
}

test("every timestamp pads to the column width, not merely to each other", () => {
  // Asserting against COLUMN_EM rather than the spread of the set is what makes
  // the rounding step falsifiable: truncating instead would still land every
  // stamp within one hair of every other, but half of one hair short of target.
  for (const stamp of everyStamp()) {
    const off = Math.abs(emWidth(padTimeColumn(stamp)) - COLUMN_EM);
    assert.ok(
      off <= COLUMN_TOLERANCE_EM,
      `${JSON.stringify(stamp)} misses the column by ${off}em`,
    );
  }
});

test("padding only ever leads, so the stamp stays flush right", () => {
  for (const stamp of everyStamp()) {
    const padded = padTimeColumn(stamp);
    assert.ok(padded.endsWith(stamp), `${JSON.stringify(padded)} moved`);
  }
});

test("an unmeasurable glyph is returned unpadded rather than misaligned", () => {
  assert.equal(padTimeColumn("∞"), "∞");
  // Partly measurable is still unmeasurable: one unknown glyph voids the width.
  assert.equal(padTimeColumn("1∞"), "1∞");
});

/** Directory names taken off the search root, shortest and longest first. */
const PROJECTS = ["orca", "pixie", "raycast", "dotfiles", "unsettled"];

test("a name that already fits is returned whole, without an ellipsis", () => {
  for (const name of PROJECTS.filter((p) => emWidth(p) <= PROJECT_EM)) {
    assert.equal(fitWidth(name, PROJECT_EM), name);
  }
  assert.equal(fitWidth("", PROJECT_EM), "");
  // Landing exactly on the budget still fits. Nothing else pins that boundary,
  // and a name a hair under its own width is the case the ellipsis pays for.
  assert.equal(fitWidth("dotfiles", emWidth("dotfiles")), "dotfiles");
  assert.ok(fitWidth("dotfiles", emWidth("dotfiles") - 0.01).endsWith("…"));
});

test("a budget that is not a real number leaves the name alone", () => {
  // NaN loses every comparison, so a cut would keep everything and still mark.
  assert.equal(fitWidth("dotfiles", NaN), "dotfiles");
  assert.equal(fitWidth("dotfiles", Infinity), "dotfiles");
});

test("the width table covers printable ASCII without shifting", () => {
  // The table is positional, so a dropped entry shifts every width after it.
  // The stamp tests only reach `y`, which leaves the tail of it unwatched.
  assert.equal(emWidth(" "), 0.2051);
  assert.equal(emWidth("W"), 0.9238);
  assert.equal(emWidth("~"), 0.6045);
  assert.ok(!Number.isNaN(emWidth("!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}")));
});

test("a name over the budget is cut, and says so", () => {
  const long = "a-very-long-worktree-name";
  assert.ok(emWidth(long) > PROJECT_EM);
  const fitted = fitWidth(long, PROJECT_EM);
  assert.ok(fitted.endsWith("…"), `${JSON.stringify(fitted)} was not marked`);
  assert.ok(long.startsWith(fitted.slice(0, -1)));
});

test("the budget stays inside the bracket it was measured against", () => {
  // The two names either side of the observed edge, asserted against the
  // constant rather than through a cut: widening past `unsettled` puts the
  // timestamp back under the clip that motivated the budget, and narrowing
  // past `dotfiles` starts cutting names that were rendering whole. Going
  // through `fitWidth` alone would accept either edge.
  assert.ok(PROJECT_EM >= emWidth("dotfiles"), `${PROJECT_EM} cuts dotfiles`);
  assert.ok(
    PROJECT_EM < emWidth("unsettled"),
    `${PROJECT_EM} spares unsettled`,
  );
  assert.equal(fitWidth("dotfiles", PROJECT_EM), "dotfiles");
  assert.equal(fitWidth("unsettled", PROJECT_EM), "unsettl…");
});

test("a cut landing exactly on the room keeps that character", () => {
  // `dot` plus the mark is the whole budget, so the `t` is the last thing that
  // fits rather than the first thing dropped.
  const budget = emWidth("dot") + emWidth("…");
  assert.equal(fitWidth("dotfiles", budget), "dot…");
});

test("no project name renders wider than its share of the column", () => {
  // The budget is what keeps the timestamp on the row, so the ellipsis has to
  // be inside it: a cut that lands exactly on the budget still overflows once
  // the mark is appended. Measurable names only — `emWidth` is the independent
  // yardstick here, and it voids on the glyphs `fitWidth` charges by estimate.
  for (const name of [...PROJECTS, "a".repeat(60), "…"]) {
    const fitted = fitWidth(name, PROJECT_EM);
    const width = emWidth(fitted);
    assert.ok(
      width <= PROJECT_EM,
      `${JSON.stringify(fitted)} is ${width}em, over ${PROJECT_EM}em`,
    );
  }
});

test("an unmeasured glyph is charged a width rather than voiding the fit", () => {
  // `emWidth` gives up on an unknown glyph, which is right for padding a stamp
  // and wrong here: a name of glyphs nothing measured would sail past the
  // budget untouched and take the timestamp with it.
  const fitted = fitWidth("∞".repeat(20), PROJECT_EM);
  assert.ok(fitted.endsWith("…"));
  assert.ok(fitted.length < 20);
});

test("a name is never cut through a grapheme cluster", () => {
  // Two budgets: one alone lands on a pair boundary by luck, and passes even
  // when the cut walks UTF-16 units instead of clusters.
  for (const budget of [PROJECT_EM, 4.5]) {
    const fitted = fitWidth("🚀".repeat(20), budget);
    assert.ok(fitted.endsWith("…"));
    assert.equal(fitted.slice(0, -1), "🚀".repeat([...fitted].length - 1));
  }
  // A joiner sequence draws as one glyph, so it is kept or dropped whole
  // rather than left hanging off a joiner.
  assert.ok(!fitWidth("👨‍👩‍👧‍👦-project", PROJECT_EM).includes("‍…"));
});

test("an accent costs what its letter costs, in either form", () => {
  // macOS hands back decomposed names, where the accent is a code point of its
  // own drawing no advance. Charging it a glyph would cut a name short of the
  // budget and orphan the mark off the letter it belongs to.
  for (const cafe of ["caf\u00e9", "cafe\u0301"]) {
    assert.equal(fitWidth(cafe, emWidth("cafe")), cafe);
    const fitted = fitWidth(`${cafe}-and-then-some`, PROJECT_EM);
    assert.ok(fitted.startsWith(cafe), `${JSON.stringify(fitted)} lost it`);
  }
});

test("the path is budgeted against what shares its line", () => {
  // A stamp costs the path the characters it draws over, so the header holds
  // one line however wide the locale writes the time.
  const afterNarrow = headerPathChars(" · 7/4/26 1:49 AM");
  const afterWide = headerPathChars(" · 12/25/26 11:49 PM");
  // Pinned, because every assertion around it is relational, and a conversion
  // that multiplied where it should divide would satisfy all of them while
  // granting the path half a line more than it can draw.
  assert.equal(afterWide, 39);
  assert.ok(
    afterWide < afterNarrow,
    `${afterWide} cost no more than ${afterNarrow}`,
  );
  // Nothing beside it leaves the whole line: what is charged is charged on the
  // stamp, and a line of nothing but code face is what `HEADER_CHARS` counted.
  assert.equal(headerPathChars(""), HEADER_CHARS);
});

test("a stamp the table cannot price is charged, not given up on", () => {
  // A locale's glyphs, not a corruption: `emWidth` voids here, and a budget of
  // the whole line would wrap it.
  const priced = headerPathChars(" · 2026年8月5日 11:49");
  assert.ok(priced > 0, "charged the whole line away");
  assert.ok(
    priced < headerPathChars(" · 12/25/26 11:49 PM"),
    `${priced} charged an unmeasured glyph less than a measured one`,
  );
});

test("a stamp wider than the line leaves the path no characters", () => {
  // Not that `fitPath` would break on a negative — it clamps as well — but a
  // count of characters that is negative is not one, and the caller spends it
  // as one.
  assert.equal(headerPathChars("x".repeat(200)), 0);
});

test("a path inside the budget is left alone", () => {
  const path = "~/code/raycast";
  assert.equal(fitPath(path, HEADER_CHARS), path);
  assert.equal(fitPath(path, path.length), path);
});

test("a long path loses its middle directories, tail first", () => {
  const path = "~/code/unsettled/.claude/worktrees/obj8-second-settlement";
  assert.equal(
    fitPath(path, path.length - 1),
    "~/code/unsettled/.claude/…/obj8-second-settlement",
  );
  // Tight enough that all but the shallowest directory has to go.
  assert.equal(fitPath(path, 40), "~/code/…/obj8-second-settlement");
});

test("an elision landing exactly on the budget is kept", () => {
  const path = "~/code/unsettled/.claude/worktrees/obj8-second-settlement";
  const kept = "~/code/unsettled/.claude/…/obj8-second-settlement";
  assert.equal(fitPath(path, kept.length), kept);
});

test("an absolute path keeps its root", () => {
  assert.equal(
    fitPath("/private/var/folders/tmp/session", 20),
    "/private/…/session",
  );
  // Down to the last head segment, which here is the empty string before the
  // leading separator: eliding that too would save one character and leave a
  // path that no longer reads as absolute.
  assert.equal(fitPath("/private/var/folders/tmp/session", 12), "/…/session");
});

test("a trailing separator does not cost the path its last segment", () => {
  // A cwd is copied out of a transcript verbatim, so it may carry one, and the
  // empty string after it would be taken for the segment that names the session.
  assert.equal(
    fitPath("~/code/unsettled/.claude/worktrees/obj8-second-settlement/", 50),
    "~/code/unsettled/.claude/…/obj8-second-settlement",
  );
  assert.equal(fitPath("~/code/raycast/", HEADER_CHARS), "~/code/raycast");
  // Nothing but separators has no segment to keep.
  assert.equal(fitPath("/", HEADER_CHARS), "/");
});

test("a Windows path loses its middle directories, not its project", () => {
  // Regression: split on "/" alone a backslash path is one segment, so no
  // elision was ever tried and the whole path fell through to the left cut —
  // losing the project name the elision exists to protect.
  const path = "C:\\Users\\aki\\code\\pixie\\.claude\\worktrees\\djinn";
  assert.equal(fitPath(path, 32), "C:\\Users\\aki\\code\\pixie\\…\\djinn");
  // Rejoined with the separator the path was written with, not the host's.
  assert.ok(!fitPath(path, 32).includes("/"));
  // Down to the drive, which is this path's root.
  assert.equal(fitPath(path, 12), "C:\\…\\djinn");
});

test("a Windows path loses its trailing separator too", () => {
  assert.equal(
    fitPath("C:\\Users\\aki\\code\\pixie\\", HEADER_CHARS),
    "C:\\Users\\aki\\code\\pixie",
  );
  // Nothing but separators has no segment to keep.
  assert.equal(fitPath("\\", HEADER_CHARS), "\\");
});

test("a backslash inside a macOS name is not a directory boundary", () => {
  // Only the separator a path is actually written with is treated as one, so a
  // legal macOS name is never split — or rejoined — through its backslash.
  const path = "/root/code/back\\slash-second-settlement/src";
  assert.equal(fitPath(path, 30), "/root/code/…/src");
  assert.equal(fitPath(path, HEADER_CHARS), path);
});

test("a segment too long for the budget is cut from the left", () => {
  // What is left of it still tells two sibling worktrees apart; the head, which
  // they share, does not.
  assert.equal(
    fitPath("~/code/obj8-second-settlement-grant", 20),
    "…nd-settlement-grant",
  );
  assert.equal(fitPath("obj8-second-settlement-grant", 10), "…ent-grant");
  // A name with no directory in it gains no separator on the way through.
  assert.ok(!fitPath("second-settlement", 8).includes("/"));
});

test("a path with no elision that fits spends the whole budget", () => {
  // Cutting back to the last segment alone would leave most of the budget
  // unspent and throw away the directory that gives the name its context.
  const path = `${"deep-directory-name-".repeat(3)}checkout/src`;
  const fitted = fitPath(path, HEADER_CHARS);
  assert.equal(fitted.length, HEADER_CHARS);
  assert.ok(fitted.endsWith("checkout/src"), `${fitted} lost its end`);
});

/** A surrogate standing alone, which is what a cut through a pair leaves. */
const LONE_SURROGATE =
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

test("a cut never splits one drawn glyph", () => {
  assert.equal(fitPath("~/aa😀bb", 4), "…bb");
  // Every budget, because the cut lands on a different code point at each one,
  // and only some of them fall inside a pair or in front of an accent. The
  // decomposed spelling is the one macOS hands back.
  for (const path of [
    "~/code/cafe\u0301-settlement",
    "~/code/x\u{1F600}-settlement",
  ]) {
    for (let budget = 2; budget <= path.length; budget++) {
      const fitted = fitPath(path, budget);
      assert.ok(fitted.length <= budget, `${fitted} overran ${budget}`);
      assert.doesNotMatch(fitted, LONE_SURROGATE, `budget ${budget} split it`);
      // A mark kept with its letter is fine; one left on the ellipsis is not.
      assert.doesNotMatch(fitted, /^…\p{M}/u, `budget ${budget} orphaned it`);
    }
  }
});

test("a budget too small for the mark keeps nothing but the mark", () => {
  assert.equal(fitPath("~/code/raycast", 0), "…");
});

test("a budget that is not a real number leaves the path alone", () => {
  // Cutting to it would return more than it was handed, as in `fitWidth`.
  assert.equal(fitPath("~/code/raycast", NaN), "~/code/raycast");
  assert.equal(fitPath("~/code/raycast", Infinity), "~/code/raycast");
});

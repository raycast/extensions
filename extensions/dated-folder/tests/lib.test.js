// Run with `npm test`. Importing `../src/lib.ts` directly relies on Node's built-in type
// stripping, so this needs Node 22.18+ or 24+ — the same runtimes `ray build` targets.
import assert from "node:assert/strict";
import { homedir } from "node:os";
import { join, resolve, sep } from "node:path";
import { describe, it } from "node:test";

import { formatDate, resolveInside, tildify } from "../src/lib.ts";

describe("formatDate", () => {
  const date = new Date(2026, 8, 7, 4, 5, 6); // 2026-09-07 04:05:06, local time

  it("expands every token, zero-padded", () => {
    assert.equal(formatDate("yyyy-MM-dd HH:mm:ss", date), "2026-09-07 04:05:06");
  });

  it("keeps single-quoted text literal", () => {
    // Without the escape, the `mm` in `summer` would read as minutes.
    assert.equal(formatDate("'summer'-yyyy", date), "summer-2026");
  });

  it("yields one quote for a doubled quote", () => {
    assert.equal(formatDate("''", date), "'");
    assert.equal(formatDate("'it''s'-dd", date), "it's-07");
  });

  it("leaves unknown characters alone", () => {
    assert.equal(formatDate("yyyy/MM/dd", date), "2026/09/07");
  });
});

describe("resolveInside", () => {
  // `resolve` pins these to the current drive on Windows (`C:\tmp`), so the expectations are
  // built the same way rather than spelled out with a leading separator.
  const tmp = resolve("/tmp");
  const root = resolve("/");

  it("resolves a name below the parent", () => {
    assert.equal(resolveInside("/tmp", "2026-09-07"), join(tmp, "2026-09-07"));
  });

  it("allows nested names", () => {
    assert.equal(resolveInside("/tmp", "2026/09/07"), join(tmp, "2026", "09", "07"));
  });

  // Regression: `base + sep` used to produce `//` for a root parent, rejecting every target.
  it("accepts a root parent, which already ends in a separator", () => {
    assert.equal(resolveInside("/", "2026-09-07"), join(root, "2026-09-07"));
  });

  it("normalises a trailing separator on the parent", () => {
    assert.equal(resolveInside("/tmp/", "2026-09-07"), join(tmp, "2026-09-07"));
  });

  it("rejects names that escape the parent", () => {
    assert.equal(resolveInside("/tmp", "../evil"), null);
    assert.equal(resolveInside("/tmp", "2026/../../evil"), null);
    assert.equal(resolveInside("/", ".."), null);
  });

  it("rejects an absolute name", () => {
    assert.equal(resolveInside("/tmp", "/evil"), null);
    assert.equal(resolveInside("/tmp", join(root, "evil")), null);
  });

  it("rejects a name that resolves to the parent itself", () => {
    assert.equal(resolveInside("/tmp", "."), null);
    assert.equal(resolveInside("/", "."), null);
  });

  it("does not treat a sibling with a shared prefix as contained", () => {
    assert.equal(resolveInside("/tmp", "../tmpevil"), null);
  });

  // A name may legitimately start with two dots; only a real `..` segment escapes.
  it("allows a name that merely starts with dots", () => {
    assert.equal(resolveInside("/tmp", "..foo"), join(tmp, "..foo"));
  });
});

describe("tildify", () => {
  it("shortens a path under the home folder", () => {
    assert.equal(tildify(join(homedir(), "Desktop", "temp")), `~${sep}Desktop${sep}temp`);
  });

  it("shortens the home folder itself", () => {
    assert.equal(tildify(homedir()), "~");
  });

  // Regression: a plain substring replace turned `/Users/anna-old` into `~-old`.
  it("leaves a sibling that shares the home folder's prefix alone", () => {
    assert.equal(tildify(`${homedir()}-old${sep}temp`), `${homedir()}-old${sep}temp`);
  });

  it("leaves an unrelated path alone", () => {
    assert.equal(tildify(`${sep}tmp${sep}temp`), `${sep}tmp${sep}temp`);
  });
});

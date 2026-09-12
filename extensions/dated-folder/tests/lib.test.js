// Run with `npm test`. Importing `../src/lib.ts` directly relies on Node's built-in type
// stripping, so this needs Node 22.18+ or 24+ — the same runtimes `ray build` targets.
import assert from "node:assert/strict";
import { homedir } from "node:os";
import { join, sep } from "node:path";
import { describe, it } from "node:test";

import { currentShellHandler, formatDate, resolveInside, tildify } from "../src/lib.ts";

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
  it("resolves a name below the parent", () => {
    assert.equal(resolveInside("/tmp", "2026-09-07"), `${sep}tmp${sep}2026-09-07`);
  });

  it("allows nested names", () => {
    assert.equal(resolveInside("/tmp", "2026/09/07"), `${sep}tmp${sep}2026${sep}09${sep}07`);
  });

  // Regression: `base + sep` used to produce `//` for a root parent, rejecting every target.
  it("accepts a root parent, which already ends in a separator", () => {
    assert.equal(resolveInside("/", "2026-09-07"), `${sep}2026-09-07`);
  });

  it("normalises a trailing separator on the parent", () => {
    assert.equal(resolveInside("/tmp/", "2026-09-07"), `${sep}tmp${sep}2026-09-07`);
  });

  it("rejects names that escape the parent", () => {
    assert.equal(resolveInside("/tmp", "../evil"), null);
    assert.equal(resolveInside("/tmp", "2026/../../evil"), null);
    assert.equal(resolveInside("/", ".."), null);
  });

  it("rejects an absolute name", () => {
    assert.equal(resolveInside("/tmp", "/evil"), null);
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
    assert.equal(resolveInside("/tmp", "..foo"), `${sep}tmp${sep}..foo`);
  });
});

describe("currentShellHandler", () => {
  const shell = (handler, date) => ({
    LSHandlerContentType: "public.unix-executable",
    LSHandlerRoleShell: handler,
    ...(date === undefined ? {} : { LSHandlerModificationDate: date }),
  });

  it("follows the most recently chosen terminal, whatever the record order", () => {
    assert.equal(
      currentShellHandler([shell("com.apple.terminal", 700), shell("com.mitchellh.ghostty", 800)]),
      "com.mitchellh.ghostty",
    );
    assert.equal(
      currentShellHandler([shell("com.mitchellh.ghostty", 800), shell("com.apple.terminal", 700)]),
      "com.mitchellh.ghostty",
    );
  });

  it("prefers a dated record over an undated one", () => {
    assert.equal(
      currentShellHandler([shell("com.apple.terminal"), shell("com.mitchellh.ghostty", 800)]),
      "com.mitchellh.ghostty",
    );
  });

  it("ignores records for other content types and roles", () => {
    const others = [
      { LSHandlerContentType: "public.html", LSHandlerRoleAll: "com.google.chrome" },
      { LSHandlerContentType: "public.unix-executable", LSHandlerRoleAll: "com.apple.finder" },
    ];
    assert.equal(currentShellHandler(others), undefined);
    assert.equal(currentShellHandler([...others, shell("com.mitchellh.ghostty", 800)]), "com.mitchellh.ghostty");
  });

  it("returns undefined for a missing or malformed LSHandlers value", () => {
    assert.equal(currentShellHandler(undefined), undefined);
    assert.equal(currentShellHandler({}), undefined);
    assert.equal(currentShellHandler([null, "not a record"]), undefined);
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

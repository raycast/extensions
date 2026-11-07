// Copied from badge-count-raycast test/badge.test.ts on 2026-09-30, unchanged except this header and import paths
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyBadge, findDockItem, rowState } from "../../src/lib/badge/badge.ts";
import type { DockApp, DockRead } from "../../src/lib/badge/badge.ts";

function item(over: Partial<DockApp> = {}): DockApp {
  return {
    bundleId: "com.apple.mail",
    path: "/System/Applications/Mail.app",
    title: "Mail",
    running: true,
    badge: null,
    ...over,
  };
}

describe("classifyBadge (R5)", () => {
  it("maps null, undefined and empty string to noBadge", () => {
    assert.deepEqual(classifyBadge(null), { kind: "noBadge" });
    assert.deepEqual(classifyBadge(undefined), { kind: "noBadge" });
    assert.deepEqual(classifyBadge(""), { kind: "noBadge" });
  });

  it('maps "0" to zero', () => {
    assert.deepEqual(classifyBadge("0"), { kind: "zero", text: "0" });
  });

  it("keeps zero and noBadge as different kinds", () => {
    assert.notEqual(classifyBadge("0").kind, classifyBadge(null).kind);
    assert.notEqual(classifyBadge("0").kind, classifyBadge("").kind);
  });
});

describe("classifyBadge numeric", () => {
  for (const text of ["1", "3", "42", "100"]) {
    it(`treats ${JSON.stringify(text)} as numeric with identical text`, () => {
      assert.deepEqual(classifyBadge(text), { kind: "numeric", text });
    });
  }
});

describe("classifyBadge non-numeric (R7)", () => {
  for (const text of ["•", "!", "99+", "1,204", "New"]) {
    it(`treats ${JSON.stringify(text)} as nonNumeric, text unchanged`, () => {
      assert.deepEqual(classifyBadge(text), { kind: "nonNumeric", text });
    });
  }

  it("keeps a leading-space number as nonNumeric verbatim", () => {
    assert.deepEqual(classifyBadge(" 3"), { kind: "nonNumeric", text: " 3" });
  });

  it('keeps "00" as nonNumeric verbatim (Zero is exactly "0")', () => {
    assert.deepEqual(classifyBadge("00"), { kind: "nonNumeric", text: "00" });
  });
});

describe("findDockItem", () => {
  const mail = item();
  const teams = item({ bundleId: "com.microsoft.teams2", path: "/Applications/Microsoft Teams.app", title: "Teams" });
  const items = [mail, teams];

  it("matches by bundleId", () => {
    assert.equal(findDockItem({ bundleId: "com.microsoft.teams2", path: "/nope" }, items), teams);
  });

  it("prefers bundleId over a conflicting path", () => {
    assert.equal(findDockItem({ bundleId: "com.apple.mail", path: teams.path }, items), mail);
  });

  it("falls back to path when bundleId is missing", () => {
    assert.equal(findDockItem({ path: teams.path }, items), teams);
    assert.equal(findDockItem({ bundleId: null, path: teams.path }, items), teams);
  });

  it("falls back to path when bundleId is not found", () => {
    assert.equal(findDockItem({ bundleId: "com.unknown", path: mail.path }, items), mail);
  });

  it("returns undefined when neither matches", () => {
    assert.equal(findDockItem({ bundleId: "com.unknown", path: "/nope.app" }, items), undefined);
    assert.equal(findDockItem({}, items), undefined);
    assert.equal(findDockItem({ bundleId: "com.apple.mail" }, []), undefined);
  });
});

describe("rowState", () => {
  const app = { bundleId: "com.apple.mail", path: "/System/Applications/Mail.app" };
  const okRead = (apps: DockApp[]): DockRead => ({ ok: true, apps });
  const failedRead: DockRead = {
    ok: false,
    failure: "permission",
    reason: "Accessibility access is off for Raycast",
    diagnostic: "diag",
  };

  it("notInstalled wins even when the read failed", () => {
    assert.deepEqual(rowState(app, false, failedRead), { kind: "notInstalled" });
    assert.deepEqual(rowState(app, false, undefined), { kind: "notInstalled" });
  });

  it("undefined read is loading", () => {
    assert.deepEqual(rowState(app, true, undefined), { kind: "loading" });
  });

  it("failed read is unavailable with reason and failure", () => {
    assert.deepEqual(rowState(app, true, failedRead), {
      kind: "unavailable",
      reason: "Accessibility access is off for Raycast",
      failure: "permission",
    });
  });

  it("ok read without matching item is notInDock", () => {
    assert.deepEqual(rowState(app, true, okRead([])), { kind: "notInDock" });
    assert.deepEqual(rowState(app, true, okRead([item({ bundleId: "x", path: "/x" })])), { kind: "notInDock" });
  });

  it('ok read with badge "2" is numeric "2"', () => {
    assert.deepEqual(rowState(app, true, okRead([item({ badge: "2" })])), { kind: "numeric", text: "2" });
  });

  it("badge null is noBadge", () => {
    assert.deepEqual(rowState(app, true, okRead([item({ badge: null })])), { kind: "noBadge" });
  });

  it('badge "0" is zero and badge "•" is nonNumeric', () => {
    assert.deepEqual(rowState(app, true, okRead([item({ badge: "0" })])), { kind: "zero", text: "0" });
    assert.deepEqual(rowState(app, true, okRead([item({ badge: "•" })])), { kind: "nonNumeric", text: "•" });
  });
});

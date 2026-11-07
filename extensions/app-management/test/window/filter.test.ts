import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dropUnresolvedOnVisibleDesktop } from "../../src/lib/window/filter.ts";
import { buildApps } from "../../src/lib/window/model.ts";
import { app, list, win } from "./fixtures.ts";

// The case observed on 2026-10-01: Reminders' real window (167) on visible Desktop 1, plus an off-screen 228×239
// panel (4571) on Desktops 5 and 1 that Accessibility does not list.
const reminders = app(704, "Reminders", { bundleId: "com.apple.reminders" });
const realWindow = win(704, 167, "Reminders");
const panel = win(704, 4571, "", {
  resolved: false,
  titleSource: "none",
  foundBy: "none",
  onScreen: false,
  spaceIds: [5, 1],
});

describe("dropUnresolvedOnVisibleDesktop", () => {
  it("drops an unresolved window that is also on a visible Desktop (the Reminders panel)", () => {
    const out = dropUnresolvedOnVisibleDesktop(list([reminders], [realWindow, panel], [1, 324]));
    assert.deepEqual(
      out.windows.map((w) => w.wid),
      [167],
    );
  });

  it("leaves Reminders with one window and no unreadable-window warning", () => {
    const [view] = buildApps(dropUnresolvedOnVisibleDesktop(list([reminders], [realWindow, panel], [1, 324])), 0);
    assert.equal(view.windows.length, 1);
    assert.equal(view.unresolvedCount, 0);
  });

  it("keeps an unresolved window that is only on hidden Desktops (an other-Desktop window)", () => {
    const otherDesktop = { ...panel, wid: 9001, spaceIds: [5] };
    const out = dropUnresolvedOnVisibleDesktop(list([reminders], [realWindow, otherDesktop], [1, 324]));
    assert.deepEqual(
      out.windows.map((w) => w.wid),
      [167, 9001],
    );
  });

  it("keeps a resolved window on several Desktops, including a visible one", () => {
    const allDesktops = win(704, 9002, "Shared", { spaceIds: [5, 1] });
    const out = dropUnresolvedOnVisibleDesktop(list([reminders], [allDesktops], [1, 324]));
    assert.equal(out.windows.length, 1);
  });

  it("keeps an unresolved window with no Space data", () => {
    const unknown = { ...panel, wid: 9003, spaceIds: [] };
    const out = dropUnresolvedOnVisibleDesktop(list([reminders], [unknown], [1, 324]));
    assert.equal(out.windows.length, 1);
  });

  it("drops nothing when Space data is unavailable", () => {
    const input = list([reminders], [realWindow, panel], [1, 324]);
    input.spaces.available = false;
    assert.equal(dropUnresolvedOnVisibleDesktop(input), input);
  });

  it("returns the same list object when nothing is dropped", () => {
    const input = list([reminders], [realWindow], [1, 324]);
    assert.equal(dropUnresolvedOnVisibleDesktop(input), input);
  });
});

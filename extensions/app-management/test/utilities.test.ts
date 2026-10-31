// T-1, T-2: the Trash row's visibility per filter, pin, and search; its own stored pins.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { ListView } from "../src/lib/badge/views.ts";
import {
  EMPTY_TRASH_COMMAND,
  parseUtilityPins,
  serializeUtilityPins,
  toggleUtilityPin,
  TRASH_ITEM_ID,
  trashVisible,
} from "../src/lib/utilities.ts";

describe("Trash row visibility", () => {
  it("follows the pin in All Apps and Pinned + Badged, and never shows in Badged Only", () => {
    const table: Array<[ListView, boolean, boolean]> = [
      ["allApps", true, true],
      ["allApps", false, false],
      ["pinnedAndBadged", true, true],
      ["pinnedAndBadged", false, false],
      ["badgedOnly", true, false],
      ["badgedOnly", false, false],
    ];
    for (const [filter, pinned, shown] of table)
      assert.equal(trashVisible(pinned, filter, ""), shown, `${filter} pinned=${pinned}`);
    assert.equal(trashVisible(true, "allApps", "   "), true, "a blank query is no search");
  });
  it("is found by search pinned or not, in All Apps and Pinned + Badged only", () => {
    for (const q of ["trash", "Tra", "empty", "empty tr", "bin", "recycle", "OPEN"]) {
      assert.equal(trashVisible(false, "allApps", q), true, q);
      assert.equal(trashVisible(false, "pinnedAndBadged", q), true, q);
      assert.equal(trashVisible(true, "badgedOnly", q), false, q);
    }
  });
  it("hides while a search does not match, even when pinned", () => {
    for (const q of ["safari", "trash safari", "x"]) assert.equal(trashVisible(true, "allApps", q), false, q);
  });
});

describe("utility pins (utilityPins.v1)", () => {
  it("reads missing or unreadable values as nothing pinned", () => {
    for (const raw of [undefined, 5, "", "{", "{}", '"trash"', "null"])
      assert.deepEqual(parseUtilityPins(raw), [], String(raw));
  });
  it("keeps known ids once and drops unknown ones", () => {
    assert.deepEqual(parseUtilityPins('["trash","trash","downloads",3]'), ["trash"]);
    assert.deepEqual(parseUtilityPins(serializeUtilityPins(["trash"])), ["trash"]);
    assert.deepEqual(parseUtilityPins(serializeUtilityPins([])), []);
  });
  it("toggles", () => {
    assert.deepEqual(toggleUtilityPin([], "trash"), ["trash"]);
    assert.deepEqual(toggleUtilityPin(["trash"], "trash"), []);
  });
});

describe("Trash row identity and target", () => {
  it("uses an id no app or window row can have", () => {
    assert.ok(
      !TRASH_ITEM_ID.startsWith("app:") && !TRASH_ITEM_ID.startsWith("win:") && !TRASH_ITEM_ID.startsWith("status:"),
    );
  });
  it("launches Raycast's own Empty Trash (never a file deletion here)", () => {
    assert.deepEqual(EMPTY_TRASH_COMMAND, {
      ownerOrAuthorName: "raycast",
      extensionName: "system-actions",
      name: "empty-trash",
    });
  });
});

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  escapeMarkdown,
  folderPaths,
  formatBytes,
  formatDimensions,
  formatDuration,
  kindName,
  ratingStars,
  savedSection,
  saveTitle,
  sectionsBySavedDay,
  sourceName,
} from "../src/lib/display";
import { SAVE } from "./fixtures";

describe("saveTitle", () => {
  test("drops links and trailing hashtags", () => {
    assert.equal(saveTitle(SAVE), "Calm interfaces");
  });

  test("keeps a caption that is only hashtags", () => {
    assert.equal(saveTitle({ ...SAVE, description: "#design #ui" }), "#design #ui");
  });

  test("falls back to the author, then the host", () => {
    assert.equal(saveTitle({ ...SAVE, description: "https://t.co/abc" }), "pond");
    assert.equal(saveTitle({ ...SAVE, description: null, author: null }), "x.com");
  });
});

test("sourceName labels known sources and passes unknown ones through", () => {
  assert.equal(sourceName("arena"), "Are.na");
  assert.equal(sourceName("somewhere"), "somewhere");
});

test("kindName names link saves as websites", () => {
  assert.equal(kindName("link"), "Website");
  assert.equal(kindName(null), null);
});

test("escapeMarkdown escapes syntax characters", () => {
  assert.equal(escapeMarkdown("*bold* [x](y)"), "\\*bold\\* \\[x\\]\\(y\\)");
});

describe("savedSection", () => {
  const now = new Date(2026, 9, 22, 15);

  test("names recent days", () => {
    assert.equal(savedSection(new Date(2026, 9, 22, 1), now), "Today");
    assert.equal(savedSection(new Date(2026, 9, 21, 23), now), "Yesterday");
    assert.equal(savedSection(new Date(2026, 9, 17), now), "Previous 7 Days");
    assert.equal(savedSection(new Date(2026, 9, 1), now), "Previous 30 Days");
  });

  test("names older saves by month", () => {
    assert.match(savedSection(new Date(2026, 5, 3), now), /2026/);
  });
});

test("sectionsBySavedDay keeps order and groups neighbors", () => {
  const now = new Date(2026, 9, 22, 15);
  const items = [
    { id: "a", savedAt: new Date(2026, 9, 22, 9).getTime() },
    { id: "b", savedAt: new Date(2026, 9, 22, 8).getTime() },
    { id: "c", savedAt: new Date(2026, 9, 21, 8).getTime() },
  ];
  const sections = sectionsBySavedDay(items, now);
  assert.deepEqual(
    sections.map((section) => [section.title, section.items.map((item) => item.id)]),
    [
      ["Today", ["a", "b"]],
      ["Yesterday", ["c"]],
    ],
  );
});

test("formatters", () => {
  assert.equal(formatDuration(75), "1:15");
  assert.equal(formatDuration(3725), "1:02:05");
  assert.equal(formatBytes(204_800), "204.8 KB");
  assert.equal(formatDimensions(SAVE.media), "1200 × 800");
  assert.equal(ratingStars(3), "★★★☆☆");
  assert.equal(ratingStars(null), null);
});

test("folderPaths builds nested paths and survives cycles", () => {
  const paths = folderPaths([
    { id: "b", name: "Fonts", parentId: "a", color: null, count: 2 },
    { id: "a", name: "Design", parentId: null, color: null, count: 1 },
    { id: "x", name: "Loop", parentId: "y", color: null, count: 0 },
    { id: "y", name: "Back", parentId: "x", color: null, count: 0 },
  ]);
  assert.deepEqual(
    paths.map((folder) => folder.path),
    ["Back / Loop", "Design", "Design / Fonts", "Loop / Back"],
  );
});

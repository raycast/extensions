import assert from "node:assert/strict";
import { test } from "node:test";
import {
  flattenBoards,
  getMediaExtension,
  getMediaFileName,
  getSaveKeywords,
  getSaveTitle,
  getSourceHost,
  matchesQuery,
  parseSaveId,
} from "./save-utils";
import { Board, Save } from "./types";

const save: Save = {
  id: "67aada20d242ec0009400825",
  short_id: "UXb_bvc",
  url: "https://savee.com/i/UXb_bvc/",
  name: "Brutalist poster",
  source_url: "https://www.example.com/poster",
  created_at: "2026-05-08T12:00:00.000Z",
  is_private: false,
  total_saves: 42,
  media: {
    type: "image",
    width: 1200,
    height: 1600,
    thumbnail: "https://dm.savee.com/t.jpg",
    original: "https://dm.savee.com/o.jpg",
  },
  detected_aesthetics: "Bold Swiss typography, grid layout, red and black",
  colors: [{ color: "#E10600", amount: 0.4 }],
  user: { id: "1", username: "aliceb", name: "Alice Bauer", url: "https://savee.com/aliceb/", avatar_url: "" },
};

test("titles fall back to the source host", () => {
  assert.equal(getSaveTitle(save), "Brutalist poster");
  assert.equal(getSaveTitle({ name: "  ", source_url: "https://www.example.com/a" }), "example.com");
  assert.equal(getSaveTitle({ name: "", source_url: null }), "Untitled");
});

test("reads the host from a source link", () => {
  assert.equal(getSourceHost("https://www.are.na/block/1"), "are.na");
  assert.equal(getSourceHost("not a url"), undefined);
  assert.equal(getSourceHost(null), undefined);
});

test("turns a savee.com link into a save id", () => {
  assert.equal(parseSaveId("https://savee.com/i/997d6DW/"), "997d6DW");
  assert.equal(parseSaveId("savee.com/i/UXb_bvc"), "UXb_bvc");
  assert.equal(parseSaveId(" 997d6DW "), "997d6DW");
});

test("filters on source, author, colors and description", () => {
  const keywords = getSaveKeywords(save);
  assert.ok(keywords.includes("example.com"));
  assert.ok(keywords.includes("aliceb"));
  assert.ok(keywords.includes("#e10600"));
  assert.ok(keywords.includes("swiss"));
});

test("every word of a query has to match", () => {
  assert.ok(matchesQuery(save, "swiss poster"));
  assert.ok(matchesQuery(save, "#E10600"));
  assert.ok(matchesQuery(save, ""));
  assert.ok(!matchesQuery(save, "swiss watercolour"));
});

test("names downloads after the save", () => {
  assert.equal(getMediaExtension("https://dm.savee.com/o", "image/jpeg"), "jpg");
  assert.equal(getMediaExtension("https://dm.savee.com/o.mp4", null), "mp4");
  assert.equal(getMediaFileName({ ...save, name: "A/B: poster" }, "jpg"), "A B poster (UXb_bvc).jpg");
});

test("puts sub boards right after their board", () => {
  const sub = {
    ...save,
    id: "s",
    short_id: "s",
    name: "Type",
    slug: "type",
    saves_count: 1,
    og_image: null,
    ownership_type: "user" as const,
  };
  const board: Board = {
    id: "b",
    short_id: "b",
    name: "Posters",
    slug: "posters",
    url: "https://savee.com/aliceb/posters/",
    is_private: false,
    saves_count: 2,
    created_at: save.created_at,
    og_image: null,
    ownership_type: "user",
    sub_boards: [sub],
  };
  const flat = flattenBoards([board]);
  assert.deepEqual(
    flat.map((item) => item.title),
    ["Posters", "Posters › Type"],
  );
  assert.equal(flat[1].parent?.id, "b");
});

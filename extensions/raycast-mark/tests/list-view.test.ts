import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import { test } from "node:test";
import { iconImageSource } from "../src/icon-service.ts";

const small = `data:image/png;base64,${"A".repeat(80)}`;
const ico = `data:image/x-icon;base64,${"A".repeat(80)}`;
const huge = `data:image/png;base64,${"A".repeat(20000)}`;

test("list icons keep small images and skip ICO or oversized data that freezes group switching", () => {
  assert.deepEqual(iconImageSource({ type: "custom", data: small }), {
    source: small,
  });
  assert.equal(iconImageSource({ type: "custom", data: ico }), undefined);
  assert.equal(iconImageSource({ type: "remote", cache: huge }), undefined);
  assert.equal(
    iconImageSource({ type: "remote", src: "https://example.test/icon.png" }),
    undefined,
  );
});

test("the command defaults to a list and can switch to the grid", async () => {
  const search = await fs.readFile(
    new URL("../src/search.tsx", import.meta.url),
    "utf8",
  );
  const item = await fs.readFile(
    new URL("../src/search/bookmark-grid-item.tsx", import.meta.url),
    "utf8",
  );
  assert.match(search, /useState<"list" \| "grid">\("list"\)/);
  assert.match(search, /view === "list" \? List : Grid/);
  assert.match(
    search,
    /view === "list" \? BookmarkListItem : BookmarkGridItem/,
  );
  assert.match(item, /<List\.Item/);
  assert.match(item, /modifiers: \["cmd"\], key: "l"/);
  assert.doesNotMatch(item, /content=\{listIcon/);
});

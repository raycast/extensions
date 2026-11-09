import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import icons from "../assets/collection-icons.json";
import { toCollection } from "../src/helpers/me";
import { buildCollectionsOptions } from "../src/helpers/collections";
import type { Entity } from "../src/helper";

const collection = (icon: unknown): Entity => ({
  id: "collection-1",
  kind: "collection",
  values: { name: "Icons", icon, cover: "https://example.org/bookmark-cover.png" },
  heads: {},
  policies: {},
  conflicts: {},
  structural: [],
  purged: false,
});

test("collection icons use real packaged assets and ignore the bookmark cover field", () => {
  const assets = path.resolve(__dirname, "../assets/collection-icons");
  assert.deepEqual(
    icons,
    readdirSync(assets)
      .filter((name) => name.endsWith(".svg"))
      .sort(),
  );
  for (const name of icons) {
    const view = toCollection(collection(`assets/collection-icons/${name}`));
    assert.deepEqual(view.cover, [`collection-icons/${name}`]);
    assert.match(readFileSync(path.join(assets, name), "utf8"), /<svg\b/);
    assert.equal(buildCollectionsOptions({ result: true, items: [view] })[0].cover, view.cover?.[0]);
  }
  for (const icon of [
    undefined,
    null,
    "",
    "📚",
    "https://example.org/icon.png",
    "assets/collection-icons/missing.svg",
    "assets/collection-icons/../book.svg",
  ]) {
    assert.equal(toCollection(collection(icon)).cover, undefined);
  }
});

// Resource provenance protects the separate graphics license and unmodified artwork.
test("color icon assets retain the pinned Twemoji bytes and license", () => {
  const provenance = JSON.parse(
    readFileSync(path.resolve(__dirname, "../assets/twemoji-source.json"), "utf8"),
  );
  assert.equal(provenance.license, "CC-BY-4.0");
  assert.deepEqual(
    icons.filter((name) => name.startsWith("twemoji-")),
    Object.keys(provenance.files).sort(),
  );
  for (const [name, entry] of Object.entries(provenance.files) as [string, { sha256: string }][]) {
    const bytes = readFileSync(path.resolve(__dirname, "../assets/collection-icons", name));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), entry.sha256);
  }
  assert.match(
    readFileSync(path.resolve(__dirname, "../assets/TWEMOJI-LICENSE.txt"), "utf8"),
    /Creative Commons Attribution 4\.0 International Public License/,
  );
});

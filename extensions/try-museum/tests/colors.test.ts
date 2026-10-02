import assert from "node:assert/strict";
import test from "node:test";
import { artworkSchema, artworkResult, type Artwork } from "../src/lib/artworks";
import { extractColor, indexArtworks, parseColor, searchArtworks, toOKLab } from "../src/lib/colors";

function artwork(id: string, palette: Artwork["palette"]): Artwork {
  return {
    id,
    title: "An Artwork",
    artist: null,
    date: null,
    sourceUrl: "https://www.nga.gov/art",
    image: { key: "artworks/nga/work-123.webp", width: 100, height: 100 },
    palette,
  };
}

test("normalizes supported color formats and rejects transparency and incomplete input", () => {
  for (const input of ["#4b6c7c", "4B6C7C", "rgb(75, 108, 124)"]) assert.equal(parseColor(input), "#4B6C7C");
  assert.equal(parseColor("teal"), "#008080");
  assert.equal(parseColor("hsl(0, 100%, 50%)"), "#FF0000");
  assert.equal(parseColor("#abc"), "#AABBCC");
  for (const input of ["", "#12", "not a color", "transparent", "rgba(0, 0, 0, 0.5)", "#FF000080"])
    assert.equal(parseColor(input), undefined);
});

test("extracts one color from a CSS declaration but does not guess between colors", () => {
  assert.equal(extractColor("background: #4b6c7c;"), "#4B6C7C");
  assert.equal(extractColor("color: rgb(75, 108, 124);"), "#4B6C7C");
  assert.equal(extractColor("#123456 and #abcdef"), undefined);
  assert.equal(extractColor("rgba(0,0,0,0.5)"), undefined);
});

test("OKLab conversion agrees with reference values", () => {
  const red = toOKLab("#FF0000");
  for (const [i, expected] of [0.6279553606, 0.2248630611, 0.1258462985].entries())
    assert.ok(Math.abs(red[i] - expected) < 1e-9);
  assert.deepEqual(toOKLab("#000000"), [0, 0, 0]);
});

test("palette coverage ranks matching art and museum filtering happens before limiting", () => {
  const index = indexArtworks([
    artwork("nga:small", [
      { hex: "#4B6C7C", share: 5 },
      { hex: "#FF0000", share: 95 },
    ]),
    artwork("met:large", [{ hex: "#4B6C7C", share: 100 }]),
    artwork("nga:other", [{ hex: "#FF0000", share: 100 }]),
  ]);
  const result = searchArtworks(index, "#4B6C7C", 1);
  assert.equal(result.closestOnly, false);
  assert.equal(result.total, 2);
  assert.equal(result.results[0].artwork.id, "met:large");
  assert.equal(searchArtworks(index, "#4B6C7C", 1, "nga").results[0].artwork.id, "nga:small");
  assert.equal(searchArtworks(index, "#4B6C7C", 1, "absent").results.length, 0);
});

test("weak matches are explicitly marked and sorted by nearest palette color", () => {
  const result = searchArtworks(
    indexArtworks([
      artwork("nga:red", [{ hex: "#FF0000", share: 100 }]),
      artwork("nga:blue", [{ hex: "#0000FF", share: 100 }]),
    ]),
    "#00FF00",
    24,
  );
  assert.equal(result.closestOnly, true);
  assert.equal(result.results.length, 2);
  assert.ok(result.results[0].distance <= result.results[1].distance);
  assert.ok(result.results.every((match) => Number.isFinite(match.distance)));
});

test("stable ID tie breaks do not depend on catalog order", () => {
  const palette = [{ hex: "#4B6C7C", share: 100 }];
  assert.deepEqual(
    searchArtworks(indexArtworks([artwork("nga:b", palette), artwork("nga:a", palette)]), "#4B6C7C", 24).results.map(
      ({ artwork }) => artwork.id,
    ),
    ["nga:a", "nga:b"],
  );
});

test("external artwork data rejects unsafe URLs and file paths; AI output is cloneable", () => {
  const value = artwork("nga:1", [{ hex: "#123456", share: 100 }]);
  assert.ok(artworkSchema.safeParse(value).success);
  for (const key of ["../secret.webp", "/tmp/secret.webp", "https://evil.example/image.webp"])
    assert.equal(artworkSchema.safeParse({ ...value, image: { ...value.image, key } }).success, false);
  assert.equal(artworkSchema.safeParse({ ...value, sourceUrl: "javascript:alert(1)" }).success, false);
  assert.equal(artworkSchema.safeParse({ ...value, palette: [{ hex: "red", share: 100 }] }).success, false);
  const result = artworkResult(value);
  assert.deepEqual(structuredClone(result), result);
  assert.equal(result.museum, "National Gallery of Art");
  assert.equal(result.imageUrl, "https://media.trymuseum.com/artworks/nga/work-123.webp");
});

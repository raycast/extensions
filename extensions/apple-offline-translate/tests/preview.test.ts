import assert from "node:assert/strict";
import test from "node:test";
import {
  pairedColumns,
  translationDocument,
  wrapPreview,
} from "../src/preview.ts";

test("preserves paragraphs and does not split emoji graphemes", () => {
  assert.deepEqual(wrapPreview("first\n\n  • second"), [
    "first",
    "",
    "  • second",
  ]);
  const text = "Hello 👩‍💻 привет ".repeat(8);
  assert.equal(wrapPreview(text).join(""), text);
  assert.ok(wrapPreview(text).some((line) => line.includes("👩‍💻")));
});
test("treats source text as text rather than SVG markup or remote images", () => {
  const image = translationDocument(
    '<script>x</script> & "quote"',
    "Result",
    "SOURCE",
    "TRANSLATION",
    true,
  );
  const svg = Buffer.from(image.split(",")[1], "base64").toString("utf8");
  assert.ok(svg.includes("&lt;script&gt;"));
  assert.ok(!svg.includes("<script>"));
  assert.ok(!svg.includes("<image"));
  assert.ok(svg.includes("&amp;"));
});
test("continuous columns include their final lines and grow without reducing the font", () => {
  const source = Array.from({ length: 40 }, (_, i) => `Source ${i + 1}`).join(
    "\n",
  );
  const translation = Array.from(
    { length: 40 },
    (_, i) => `Перевод ${i + 1}`,
  ).join("\n");
  const columns = pairedColumns(source, translation);
  assert.equal(columns.source.join("\n"), source);
  assert.equal(columns.translation.join("\n"), translation);
  assert.ok(columns.height > pairedColumns("Short", "Коротко").height);
  const svg = Buffer.from(
    translationDocument(
      source,
      translation,
      "SOURCE",
      "TRANSLATION",
      true,
    ).split(",")[1],
    "base64",
  ).toString("utf8");
  assert.equal((svg.match(/<rect /g) ?? []).length, 2);
  assert.ok(svg.includes('font-size="19"'));
  assert.ok(svg.includes("Source 40") && svg.includes("Перевод 40"));
});
test("different wrapping keeps corresponding paragraphs at the same vertical position", () => {
  const columns = pairedColumns(
    "Short.\n\nFinal source.",
    "A much longer translated paragraph that wraps across several visual lines.\n\nFinal translation.",
  );
  assert.equal(
    columns.source.indexOf("Final source."),
    columns.translation.indexOf("Final translation."),
  );
  assert.equal(columns.source.length, columns.translation.length);
});
test("one long paragraph is not truncated or split into separate cards", () => {
  const source = "A very long source sentence. ".repeat(80);
  const translation = "Короткий перевод.";
  const columns = pairedColumns(source, translation);
  assert.equal(columns.source.join(""), source);
  assert.equal(columns.translation.join(""), translation);
});

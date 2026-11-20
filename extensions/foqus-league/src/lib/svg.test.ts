import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CHART_WIDTH,
  escapeXml,
  luminance,
  markdownImage,
  px,
  rect,
  svg,
  text,
  textWidth,
  toDataUri,
  truncateToWidth,
} from "./svg.ts";

test("escapeXml escapes the five XML entities, ampersand first", () => {
  assert.equal(escapeXml("<a&b>"), "&lt;a&amp;b&gt;");
  assert.equal(escapeXml(`he said "no" & didn't`), "he said &quot;no&quot; &amp; didn&apos;t");
  assert.equal(escapeXml("plain"), "plain");
  assert.equal(escapeXml("&amp;"), "&amp;amp;");
});

test("textWidth grows with length, size and weight", () => {
  assert.equal(textWidth("", 13), 0);
  assert.ok(textWidth("aa", 13) > textWidth("a", 13));
  assert.ok(textWidth("aaa", 13) > textWidth("aa", 13));
  assert.ok(textWidth("a", 26) > textWidth("a", 13));
  assert.ok(textWidth("a", 13, 700) > textWidth("a", 13, 400));
});

test("textWidth ranks narrow, normal and wide glyphs", () => {
  assert.ok(textWidth("i", 13) < textWidth("a", 13));
  assert.ok(textWidth("a", 13) < textWidth("W", 13));
});

test("truncateToWidth leaves text that already fits", () => {
  const s = "Deep work";
  assert.equal(truncateToWidth(s, { maxWidth: textWidth(s, 12) + 1, fontSize: 12 }), s);
});

test("truncateToWidth never exceeds its budget and always marks the clip", () => {
  const s = "A goal name far too long for the slot it is given";
  for (let maxWidth = 12; maxWidth <= 220; maxWidth += 4) {
    const out = truncateToWidth(s, { maxWidth, fontSize: 12 });
    assert.ok(out.endsWith("…"), `no ellipsis at ${maxWidth}: ${out}`);
    assert.ok(out.length < s.length, `not clipped at ${maxWidth}`);
    assert.ok(textWidth(out, 12) <= maxWidth || out.length <= 2, `overflowed ${maxWidth}: ${out}`);
  }
});

test("luminance ranks known colours", () => {
  assert.equal(px(luminance("#ffffff")), 1);
  assert.equal(luminance("#000000"), 0);
  assert.ok(luminance("#808080") > luminance("#000000"));
  assert.ok(luminance("#ffffff") > luminance("#808080"));
  assert.ok(luminance("#00ff00") > luminance("#ff0000"));
  assert.ok(luminance("#ff0000") > luminance("#0000ff"));
});

test("px keeps two decimals", () => {
  assert.equal(px(1.23456), 1.23);
  assert.equal(px(10), 10);
  assert.equal(px(-1.239), -1.24);
});

test("text escapes its content and carries its options", () => {
  const out = text(1.239, 2, "a & b", { size: 11, weight: 600, fill: "#fff", anchor: "end", spacing: 1 });
  assert.equal(
    out,
    '<text x="1.24" y="2" font-size="11" font-weight="600" fill="#fff" text-anchor="end" letter-spacing="1">a &amp; b</text>',
  );
  assert.ok(text(0, 0, "x", { fill: "#000" }).includes('font-size="13"'));
});

test("rect clamps negative extents and defaults to no fill", () => {
  assert.equal(rect(0, 0, -5, -5), '<rect x="0" y="0" width="0" height="0" fill="none" />');
  assert.equal(
    rect(1, 2, 3, 4, { rx: 3, fill: "#abc", stroke: "#def", opacity: 0.5 }),
    '<rect x="1" y="2" width="3" height="4" rx="3" fill="#abc" stroke="#def" stroke-width="1" opacity="0.5" />',
  );
});

test("svg ceils its height and omits an empty defs", () => {
  const out = svg(100, 10.2, "Helvetica", "<g />");
  assert.ok(out.startsWith('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="11" viewBox="0 0 100 11"'));
  assert.ok(out.includes('font-family="Helvetica"'));
  assert.ok(!out.includes("<defs>"));
  assert.ok(out.trimEnd().endsWith("</svg>"));
  assert.ok(svg(10, 10, "f", "", "<clipPath />").includes("<defs><clipPath /></defs>"));
});

test("toDataUri round-trips the markup", () => {
  const markup = "<svg>ünïcode</svg>";
  const uri = toDataUri(markup);
  assert.ok(uri.startsWith("data:image/svg+xml;base64,"));
  assert.equal(Buffer.from(uri.slice("data:image/svg+xml;base64,".length), "base64").toString("utf8"), markup);
});

test("markdownImage sets the alt text, the data URI and the Raycast width", () => {
  assert.equal(markdownImage("Alt", "<svg/>"), `![Alt](${toDataUri("<svg/>")}?raycast-width=${CHART_WIDTH})`);
  assert.equal(markdownImage("Alt", "<svg/>", 320), `![Alt](${toDataUri("<svg/>")}?raycast-width=320)`);
});

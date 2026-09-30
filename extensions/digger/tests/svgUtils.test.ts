import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  displaySafe,
  extractSvgs,
  isSvgUrl,
  mergeExternalSprites,
  parseSvgDocument,
  quickLookMarkup,
  rebuildSpriteSymbols,
  svgDataUri,
  themedThumbnail,
  withBackdrop,
} from "../src/utils/svgUtils.ts";

const PAGE = "https://example.com/dir/page.html";
const OPTS = { maxAssets: 1000 };
const doc = (body: string, head = "") => `<!doctype html><html><head>${head}</head><body>${body}</body></html>`;
const CIRCLE = `<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>`;

test("inline top-level svg is extracted with an xmlns added", () => {
  const scan = extractSvgs(doc(CIRCLE), PAGE, OPTS);
  assert.equal(scan.assets.length, 1);
  const a = scan.assets[0];
  assert.equal(a.source, "inline");
  assert.match(a.markup!, /^<svg[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(a.markup!, /<circle/);
  assert.equal(a.bytes, a.markup!.length);
});

test("xlink:href keeps its prefix and the namespace is declared", () => {
  const scan = extractSvgs(doc(`<svg><image xlink:href="a.png"/></svg>`), PAGE, OPTS);
  assert.match(scan.assets[0].markup!, /<image xlink:href="https:\/\/example\.com\/dir\/a\.png"/);
  assert.match(scan.assets[0].markup!, /xmlns:xlink="http:\/\/www\.w3\.org\/1999\/xlink"/);
});

test("nested svg is not a separate asset", () => {
  const scan = extractSvgs(
    doc(`<svg viewBox="0 0 20 20"><svg viewBox="0 0 10 10"><rect width="1" height="1"/></svg></svg>`),
    PAGE,
    OPTS,
  );
  assert.equal(scan.assets.length, 1);
});

test("identical inline svgs dedupe, counting occurrences", () => {
  const scan = extractSvgs(doc(CIRCLE + "\n" + CIRCLE.replace("><", ">  <")), PAGE, OPTS);
  assert.equal(scan.assets.length, 1);
  assert.equal(scan.assets[0].occurrences, 2);
  assert.equal(scan.total, 2);
});

test("a symbol becomes a standalone sprite asset carrying its viewBox and id as name", () => {
  const scan = extractSvgs(
    doc(`<svg style="display:none"><symbol id="icon-star" viewBox="0 0 24 24"><path d="M1 1L2 2"/></symbol></svg>`),
    PAGE,
    OPTS,
  );
  assert.equal(scan.assets.length, 1, "the hidden sprite container itself is not an asset");
  const a = scan.assets[0];
  assert.equal(a.source, "sprite");
  assert.equal(a.name, "icon-star");
  assert.match(a.markup!, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 24 24">/);
  assert.match(a.markup!, /<path d="M1 1L2 2"/);
  assert.doesNotMatch(a.markup!, /<symbol/);
});

test("an inline svg that only uses a symbol counts as an occurrence of that symbol", () => {
  const scan = extractSvgs(
    doc(
      `<svg style="display:none"><symbol id="s" viewBox="0 0 2 2"><path d="M0 0"/></symbol></svg>` +
        `<svg class="i"><use href="#s"/></svg><svg><use xlink:href="#s"></use></svg>`,
    ),
    PAGE,
    OPTS,
  );
  assert.equal(scan.assets.length, 1);
  assert.equal(scan.assets[0].source, "sprite");
  assert.equal(scan.assets[0].occurrences, 2, "two uses; the definition is not a use");
});

test("a symbol nothing uses is kept with zero occurrences, not a made-up one", () => {
  const scan = extractSvgs(
    doc(`<svg style="display:none"><symbol id="u" viewBox="0 0 1 1"><path d="M0 0"/></symbol></svg>`),
    PAGE,
    OPTS,
  );
  assert.equal(scan.assets[0].occurrences, 0);
  assert.equal(scan.total, 0);
});

test("an inline svg mixing <use> with its own content is made self-contained", () => {
  const scan = extractSvgs(
    doc(
      `<svg style="display:none"><symbol id="dot" viewBox="0 0 2 2"><circle r="1"/></symbol></svg>` +
        `<svg viewBox="0 0 10 10"><rect width="10" height="10"/><use href="#dot" x="2"/></svg>`,
    ),
    PAGE,
    OPTS,
  );
  const inline = scan.assets.find((a) => a.source === "inline")!;
  assert.ok(inline, "inline asset present");
  assert.match(
    inline.markup!,
    /<defs><symbol id="dot" viewBox="0 0 2 2"><circle r="1"(?:\/>|><\/circle>)<\/symbol><\/defs>/,
  );
});

test("img src .svg becomes an absolute url asset; png is ignored", () => {
  const scan = extractSvgs(doc(`<img src="../logo.svg?v=2" alt="Acme"><img src="/x.png">`), PAGE, OPTS);
  assert.equal(scan.assets.length, 1);
  assert.equal(scan.assets[0].source, "img");
  assert.equal(scan.assets[0].url, "https://example.com/logo.svg?v=2");
  assert.equal(scan.assets[0].name, "Acme");
  assert.equal(scan.assets[0].markup, undefined);
});

test("data-uri svg images decode to markup (utf8 and base64)", () => {
  const raw = `<svg xmlns="http://www.w3.org/2000/svg"><rect width="3" height="3"/></svg>`;
  const b64 = Buffer.from(raw).toString("base64");
  const scan = extractSvgs(
    doc(`<img src="data:image/svg+xml,${encodeURIComponent(raw)}"><img data-src="data:image/svg+xml;base64,${b64}">`),
    PAGE,
    OPTS,
  );
  assert.equal(scan.assets.length, 1, "same markup both ways dedupes");
  assert.equal(scan.assets[0].markup, raw);
  assert.equal(scan.assets[0].occurrences, 2);
});

test("srcset and <picture><source> pick only svg candidates", () => {
  const scan = extractSvgs(
    doc(
      `<img srcset="/a.svg 1x, /b.png 2x"><picture><source type="image/svg+xml" srcset="/c"><img src="/d.jpg"></picture>`,
    ),
    PAGE,
    OPTS,
  );
  const urls = scan.assets.map((a) => a.url).sort();
  assert.deepEqual(urls, ["https://example.com/a.svg", "https://example.com/c"]);
});

test("object, embed and iframe svg references are found", () => {
  const scan = extractSvgs(
    doc(
      `<object data="/o.svg"></object><embed src="/e.svg"><iframe src="/f.svg"></iframe><iframe src="/g.html"></iframe>`,
    ),
    PAGE,
    OPTS,
  );
  assert.deepEqual(scan.assets.map((a) => a.url).sort(), [
    "https://example.com/e.svg",
    "https://example.com/f.svg",
    "https://example.com/o.svg",
  ]);
  assert.ok(scan.assets.every((a) => a.source === "object"));
});

test("svg favicons from <link> are found", () => {
  const scan = extractSvgs(
    doc(
      "",
      `<link rel="icon" type="image/svg+xml" href="/fav"><link rel="mask-icon" href="/pin.svg"><link rel="icon" href="/f.ico">`,
    ),
    PAGE,
    OPTS,
  );
  assert.deepEqual(scan.assets.map((a) => a.url).sort(), ["https://example.com/fav", "https://example.com/pin.svg"]);
  assert.ok(scan.assets.every((a) => a.source === "favicon"));
});

test("css url() in <style> and style attributes are found, data-uris decoded", () => {
  const raw = `<svg xmlns="http://www.w3.org/2000/svg"><path d="M9 9"/></svg>`;
  const scan = extractSvgs(
    doc(
      `<div style="background-image: url('/bg.svg')"></div>`,
      `<style>.a{mask-image:url("data:image/svg+xml,${encodeURIComponent(raw)}")} .b{background:url(/c.png)}</style>`,
    ),
    PAGE,
    OPTS,
  );
  const css = scan.assets.filter((a) => a.source === "css");
  assert.equal(css.length, 2);
  assert.ok(css.some((a) => a.url === "https://example.com/bg.svg"));
  assert.ok(css.some((a) => a.markup === raw));
});

test("svgs inside <template> are found, and counted once", () => {
  const scan = extractSvgs(doc(`<template><div>${CIRCLE}</div></template>`), PAGE, OPTS);
  assert.equal(scan.assets.length, 1);
  assert.equal(scan.assets[0].source, "inline");
  assert.equal(scan.assets[0].occurrences, 1);
  assert.equal(scan.total, 1);
});

test("external sprite references are collected per file with the ids used", () => {
  const scan = extractSvgs(
    doc(
      `<svg><use href="/icons.svg#a"/></svg><svg><use href="/icons.svg#b"/></svg><svg><use href="/icons.svg#a"/></svg>`,
    ),
    PAGE,
    OPTS,
  );
  assert.equal(scan.assets.length, 0, "a bare external <use> has nothing to show until the file is read");
  assert.equal(scan.externalSprites.length, 1);
  assert.equal(scan.externalSprites[0].url, "https://example.com/icons.svg");
  assert.deepEqual([...scan.externalSprites[0].ids].sort(), ["a", "b"]);
  assert.deepEqual({ ...scan.externalSprites[0].uses }, { a: 2, b: 1 });
});

test("rebuildSpriteSymbols returns the requested symbols from a sprite file", () => {
  const file = `<svg xmlns="http://www.w3.org/2000/svg"><symbol id="a" viewBox="0 0 1 1"><path d="M0 0"/></symbol><symbol id="b"><g/></symbol><symbol id="c"/></svg>`;
  const out = rebuildSpriteSymbols(file, "https://example.com/icons.svg", { a: 2, b: 1 });
  assert.deepEqual(out.map((a) => a.name).sort(), ["a", "b"]);
  const a = out.find((x) => x.name === "a")!;
  assert.equal(a.source, "sprite");
  assert.equal(a.occurrences, 2);
  assert.equal(a.url, "https://example.com/icons.svg#a");
  assert.match(a.markup!, /viewBox="0 0 1 1"/);
});

test("name inference: title, aria-label, id, css-module class, BEM class, fallback", () => {
  const scan = extractSvgs(
    doc(
      `<svg><title>Brand Logo</title><rect width="1"/></svg>` +
        `<svg aria-label="Search"><rect width="2"/></svg>` +
        `<svg id="hero-art"><rect width="3"/></svg>` +
        `<svg class="Navbar-module__pSp8Ga__logo"><rect width="4"/></svg>` +
        `<svg class="hds-icon navigation__chevron-down-icon"><rect width="5"/></svg>` +
        `<svg class="sx-1fwcy2r sx-13jp3wb"><rect width="6"/></svg>`,
    ),
    PAGE,
    OPTS,
  );
  const names = scan.assets.map((a) => a.name);
  for (const expected of ["Brand Logo", "Search", "hero-art", "Navbar logo", "chevron-down-icon"]) {
    assert.ok(names.includes(expected), `missing ${expected} in ${JSON.stringify(names)}`);
  }
  assert.ok(
    names.some((n) => /^SVG \d+$/.test(n)),
    `hash-only class falls back: ${JSON.stringify(names)}`,
  );
});

test("assets are ordered largest first", () => {
  const small = `<svg><rect width="1"/></svg>`;
  const big = `<svg><path d="${"M1 1 ".repeat(50)}"/></svg>`;
  const scan = extractSvgs(doc(small + big), PAGE, OPTS);
  assert.ok(scan.assets[0].bytes > scan.assets[1].bytes);
});

test("maxAssets caps the list and reports truncation", () => {
  const many = Array.from({ length: 5 }, (_, i) => `<svg><rect width="${i}"/></svg>`).join("");
  const scan = extractSvgs(doc(many), PAGE, { maxAssets: 3 });
  assert.equal(scan.assets.length, 3);
  assert.equal(scan.truncated, true);
});

test("isSvgUrl", () => {
  assert.equal(isSvgUrl("/a/b.svg"), true);
  assert.equal(isSvgUrl("/a/b.SVG?x=1#y"), true);
  assert.equal(isSvgUrl("data:image/svg+xml;base64,AAA"), true);
  assert.equal(isSvgUrl("/a/svg.png"), false);
  assert.equal(isSvgUrl("/a/b.svgz"), false);
});

test("svgDataUri round-trips through decodeURIComponent", () => {
  const raw = `<svg xmlns="http://www.w3.org/2000/svg"><text>a#b%c "q"</text></svg>`;
  const uri = svgDataUri(raw);
  assert.ok(uri.startsWith("data:image/svg+xml,"));
  assert.equal(decodeURIComponent(uri.slice("data:image/svg+xml,".length)), raw);
});

test("themedThumbnail gives currentColor a readable color per theme and leaves the export markup alone", () => {
  const raw = `<svg xmlns="http://www.w3.org/2000/svg"><path stroke="currentColor"/></svg>`;
  const t = themedThumbnail(raw);
  const light = decodeURIComponent(t.light.slice(t.light.indexOf(",") + 1));
  const dark = decodeURIComponent(t.dark.slice(t.dark.indexOf(",") + 1));
  assert.match(light, /^<svg[^>]* color="#[0-9a-f]{6}"/i);
  assert.match(dark, /^<svg[^>]* color="#[0-9a-f]{6}"/i);
  assert.notEqual(light, dark);
  assert.match(dark, /^<svg[^>]* fill="#[0-9a-f]{6}"/i, "dark variant lifts default-black fill");
});

test("themedThumbnail does not override a root fill the author set", () => {
  const raw = `<svg xmlns="http://www.w3.org/2000/svg" fill="#ff0000"><path/></svg>`;
  const dark = decodeURIComponent(themedThumbnail(raw).dark.split(",").slice(1).join(","));
  assert.match(dark, /fill="#ff0000"/);
  assert.equal((dark.match(/fill=/g) ?? []).length, 1);
});

test("the same artwork at two sizes is one asset (root width/height/class ignored)", () => {
  const a = `<svg viewBox="0 0 140 71" width="61" height="31" class="a"><path d="M1 1"/></svg>`;
  const b = `<svg viewBox="0 0 140 71" width="69" height="35" class="b"><path d="M1 1"/></svg>`;
  const scan = extractSvgs(doc(a + b), PAGE, OPTS);
  assert.equal(scan.assets.length, 1);
  assert.equal(scan.assets[0].occurrences, 2);
});

test("different viewBox is different artwork", () => {
  const a = `<svg viewBox="0 0 10 10"><path d="M1 1"/></svg>`;
  const b = `<svg viewBox="0 0 20 20"><path d="M1 1"/></svg>`;
  assert.equal(extractSvgs(doc(a + b), PAGE, OPTS).assets.length, 2);
});

test("utility-class names are rejected, and a generic css-module part falls back to the module", () => {
  const scan = extractSvgs(
    doc(
      `<svg class="fill-none size-4 shrink-0"><rect width="1"/></svg>` +
        `<svg class="AnimatedCmdSpaceKeyboard-module__1XomiW__svg"><rect width="2"/></svg>`,
    ),
    PAGE,
    OPTS,
  );
  const names = scan.assets.map((a) => a.name);
  assert.ok(!names.includes("fill-none"), JSON.stringify(names));
  assert.ok(names.includes("AnimatedCmdSpaceKeyboard"), JSON.stringify(names));
});

test("React useId suffixes (18 and 19 formats) do not split one artwork into two", () => {
  const mk = (id: string) =>
    `<svg viewBox="0 0 9 9"><mask id="m${id}"/><g mask="url(#m${id})"><path d="M1 1"/></g></svg>`;
  const scan = extractSvgs(doc(mk("_R_59unacplei_") + mk("_R_9hunacplei_") + mk(":r1:") + mk(":R2a:")), PAGE, OPTS);
  assert.equal(scan.assets.length, 1);
  assert.equal(scan.assets[0].occurrences, 4);
});

test("a root style is part of the artwork: color variants stay separate", () => {
  const scan = extractSvgs(
    doc(`<svg style="fill:red"><path d="M1 1"/></svg><svg style="fill:blue"><path d="M1 1"/></svg>`),
    PAGE,
    OPTS,
  );
  assert.equal(scan.assets.length, 2);
});

function assertWellFormedXml(markup: string) {
  const f = join(mkdtempSync(join(tmpdir(), "svgxml-")), "a.svg");
  writeFileSync(f, markup);
  execFileSync("/usr/bin/xmllint", ["--noout", f], { stdio: "pipe" }); // throws on any XML error
}

test("every export path yields well-formed XML (HTML entities, void-ish elements, borrowed defs)", () => {
  const scan = extractSvgs(
    doc(
      `<svg style="display:none"><symbol id="s" viewBox="0 0 2 2"><text>x&nbsp;y</text><linearGradient id="g"/></symbol></svg>` +
        `<svg viewBox="0 0 10 10"><text xml:space="preserve">a&nbsp;b &copy; &amp;</text><rect fill="url(#g)"/><use href="#s"/></svg>` +
        `<svg><use href="#s"/></svg>`,
    ),
    PAGE,
    OPTS,
  );
  assert.ok(scan.assets.length >= 2);
  const inline = scan.assets.find((a) => a.source === "inline")!;
  assert.match(inline.markup!, /<use xlink:href="#s"|<use href="#s"/);
  assert.match(inline.markup!, /xml:space="preserve"/, "prefixed attributes keep their prefix");
  for (const a of scan.assets) {
    assert.doesNotMatch(a.markup!, /&nbsp;|&copy;/, "HTML-only entities are not XML");
    assertWellFormedXml(a.markup!);
  }
});

test("rebuilt external sprite symbols are well-formed XML", () => {
  const file = `<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"/></defs><symbol id="a" viewBox="0 0 1 1"><path fill="url(#g)" d="M0 0"/></symbol></svg>`;
  const [a] = rebuildSpriteSymbols(file, "https://example.com/i.svg", { a: 1 });
  assert.match(a.markup!, /<linearGradient id="g"\/>/, "the gradient it references comes along");
  assertWellFormedXml(a.markup!);
});

// ---- Codex round 2 (2026-09-29) ----
const X = (html: string, page = PAGE) => extractSvgs(html.startsWith("<!doctype") ? html : doc(html), page, OPTS);
const inlineOf = (s: ReturnType<typeof X>) => s.assets.filter((a) => a.source === "inline");

test("#1 symbol presentation attributes travel to the standalone root, escaped", () => {
  const s = X(
    `<svg><symbol id="a" viewBox="0 0 10 10" fill="red" style="stroke:blue" data-x='say "hi"'><rect width="10" height="10"/></symbol></svg>`,
  );
  const m = s.assets[0].markup!;
  assert.match(m, /^<svg[^>]* fill="red"/);
  assert.match(m, /^<svg[^>]* style="stroke:blue"/);
  assert.doesNotMatch(m, /^<svg[^>]* id="a"/, "the symbol id is not carried onto the root");
  assertWellFormedXml(m);
});

test("#8 odd attribute values are escaped, not interpolated raw", () => {
  const s = X(`<svg><symbol id="a" viewBox="0 0 10 10 &quot;"><rect width="10" height="10"/></symbol></svg>`);
  assertWellFormedXml(s.assets[0].markup!);
});

test("#2 a wrapper with its own fill or a transformed use is its own asset, not a bare symbol use", () => {
  const s = X(
    `<svg><symbol id="a" viewBox="0 0 10 10"><rect width="10" height="10"/></symbol></svg>` +
      `<svg class="icon"><use href="#a"/></svg><svg fill="red"><use href="#a"/></svg><svg><use href="#a" transform="scale(.5)"/></svg>`,
  );
  assert.equal(inlineOf(s).length, 2, "fill and transform variants are kept");
  assert.equal(s.assets.find((a) => a.source === "sprite")!.occurrences, 3, "all three are uses of the symbol");
});

test("#3 borrowing a descendant and its ancestor copies each id once", () => {
  const s = X(
    `<svg><defs><g id="g"><path id="p" d="M0 0h10v10z"/></g></defs></svg><svg><use href="#p"/><use href="#g"/></svg>`,
  );
  const m = inlineOf(s)[0].markup!;
  assert.equal((m.match(/id="p"/g) ?? []).length, 1);
});

test("#4 references inside embedded <style>, and uppercase URL(), are borrowed", () => {
  const defs = `<svg><defs><linearGradient id="a"><stop stop-color="red"/></linearGradient><linearGradient id="b"><stop/></linearGradient></defs></svg>`;
  const s = X(
    defs +
      `<svg><style>.st0{fill:url(#a)}</style><rect class="st0" width="10" height="10"/></svg><svg><rect style="fill:URL(#b)" width="1" height="1"/></svg>`,
  );
  const [x, y] = inlineOf(s).sort((p, q) => q.bytes - p.bytes);
  assert.ok(
    [x, y].some((a) => /linearGradient id="a"/.test(a.markup!)),
    "style-sheet reference",
  );
  assert.ok(
    [x, y].some((a) => /linearGradient id="b"/.test(a.markup!)),
    "uppercase URL()",
  );
});

test("#5 long reference chains are followed to the end", () => {
  const s = X(
    `<svg><defs><linearGradient id="a" href="#b"/><linearGradient id="b" href="#c"/><linearGradient id="c" href="#d"/>` +
      `<linearGradient id="d" href="#e"/><linearGradient id="e" href="#f"/><linearGradient id="f"><stop stop-color="red"/></linearGradient></defs></svg>` +
      `<svg><rect width="10" height="10" fill="url(#a)"/></svg>`,
  );
  assert.match(inlineOf(s)[0].markup!, /linearGradient id="f"/);
});

test("#6 foreignObject HTML keeps the XHTML namespace", () => {
  const s = X(`<svg><foreignObject width="100" height="100"><div>Hello<br>world</div></foreignObject></svg>`);
  assert.match(s.assets[0].markup!, /<div xmlns="http:\/\/www\.w3\.org\/1999\/xhtml">/);
});

test("#7 rebuilt external symbols keep namespace declarations they use", () => {
  const file = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"><symbol id="a"><path inkscape:label="X" d="M0 0"/></symbol></svg>`;
  const [a] = rebuildSpriteSymbols(file, "https://e.com/s.svg", { a: 1 });
  assert.match(a.markup!, /xmlns:inkscape="http:\/\/www\.inkscape\.org\/namespaces\/inkscape"/);
});

test("#10 #11 #12 data URIs: percent-escaped base64, fragments, and non-SVG documents", () => {
  const b64 = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg"><text>abc</text></svg>`)
    .toString("base64")
    .replace(/=/g, "%3D");
  const s = X(
    `<img src="data:image/svg+xml;base64,${b64}">` +
      `<img src="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cview%20id%3D%22a%22%2F%3E%3C%2Fsvg%3E#a">` +
      `<img src="data:image/svg+xml,%3Chtml%3E%3Csvg%3E%3C/svg%3E%3C/html%3E">`,
  );
  assert.equal(s.assets.length, 2, "the html-rooted payload is not an SVG");
  for (const a of s.assets) assertWellFormedXml(a.markup!);
});

test("#12 a malformed data-URI SVG is normalized to well-formed XML", () => {
  const s = X(`<img src="data:image/svg+xml,%3Csvg%3E%3Cpath%3E%3C/svg%3E">`);
  for (const a of s.assets) assertWellFormedXml(a.markup!);
});

test("#13 id canonicalization keeps reference relationships distinct", () => {
  const mk = (a: string, b: string, use: string) =>
    `<svg><defs><linearGradient id="${a}"><stop stop-color="red"/></linearGradient><linearGradient id="${b}"><stop stop-color="blue"/></linearGradient></defs><rect width="10" height="10" fill="url(#${use})"/></svg>`;
  assert.equal(X(mk("_R_a_", "_R_b_", "_R_a_") + mk("_R_c_", "_R_d_", "_R_d_")).assets.length, 2);
  assert.equal(
    X(mk("_R_a_", "_R_b_", "_R_a_") + mk("_R_c_", "_R_d_", "_R_c_")).assets.length,
    1,
    "same structure still merges",
  );
});

test("#15 root id/class stay in the key when an embedded stylesheet can select them", () => {
  const css = `<style>#red {fill:red} #blue {fill:blue}</style><rect width="10" height="10"/>`;
  assert.equal(X(`<svg id="red">${css}</svg><svg id="blue">${css}</svg>`).assets.length, 2);
});

test("#16 width/height are artwork when there is no viewBox", () => {
  const r = `<rect width="100%" height="100%" rx="5"/>`;
  assert.equal(X(`<svg width="10" height="10">${r}</svg><svg width="100" height="10">${r}</svg>`).assets.length, 2);
});

test("#17 a symbol used inside a group, or beside other shapes, is not 'unused'", () => {
  const s = X(
    `<svg><symbol id="a"><rect width="10" height="10"/></symbol></svg><svg><g><use href="#a"/></g></svg><svg><circle r="1"/><use href="#a"/></svg>`,
  );
  assert.equal(s.assets.find((a) => a.source === "sprite")!.occurrences, 2);
});

test("#19 external sprite uses count toward total", () => {
  assert.equal(X(`<svg><use href="sprite.svg#a"/></svg>`).total, 1);
});

test("#20 prototype-named ids are ordinary ids", () => {
  const s = X(`<svg><use href="sprite.svg#__proto__"/></svg><svg><use href="sprite.svg#constructor"/></svg>`);
  const uses = s.externalSprites[0].uses;
  assert.equal(uses["__proto__"], 1);
  assert.equal(uses["constructor"], 1);
  assert.deepEqual([...s.externalSprites[0].ids].sort(), ["__proto__", "constructor"]);
});

test("#21 percent-encoded fragments resolve", () => {
  const s = X(`<svg><defs><path id="icon:check" d="M0 0h10v10z"/></defs></svg><svg><use href="#icon%3Acheck"/></svg>`);
  assert.match(inlineOf(s)[0].markup!, /<path id="icon:check"/);
  const file = `<svg xmlns="http://www.w3.org/2000/svg"><symbol id="icon:check"><path d="M0 0"/></symbol></svg>`;
  assert.equal(X(`<svg><use href="s.svg#icon%3Acheck"/></svg>`).externalSprites[0].ids[0], "icon:check");
  assert.equal(rebuildSpriteSymbols(file, "https://e.com/s.svg", { "icon:check": 1 }).length, 1);
});

test("#22 <base href> is the base for relative references", () => {
  const s = extractSvgs(
    `<!doctype html><html><head><base href="https://cdn.example.com/assets/"></head><body><img src="a.svg"></body></html>`,
    "https://example.com/page",
    OPTS,
  );
  assert.equal(s.assets[0].url, "https://cdn.example.com/assets/a.svg");
});

test("#23 relative image and external-use references are made absolute in exported markup", () => {
  const s = X(
    `<svg><image href="photo.png" width="20" height="20"/><path d="M0 0h10v10z"/><use href="sprite.svg#a"/></svg>`,
  );
  const m = inlineOf(s)[0].markup!;
  assert.match(m, /href="https:\/\/example\.com\/dir\/photo\.png"/);
  assert.match(m, /href="https:\/\/example\.com\/dir\/sprite\.svg#a"/);
});

test("#24 an external <use> with no fragment is recorded as a file", () => {
  const s = X(`<svg><use href="icon.svg"/></svg>`);
  assert.equal(s.assets.length, 1);
  assert.equal(s.assets[0].url, "https://example.com/dir/icon.svg");
});

test("#25 minified srcset (no space after comma) finds every candidate; data URIs survive", () => {
  const s = X(
    `<img srcset="a.svg 1x,b.svg 2x"><img srcset="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%2F%3E 1x">`,
  );
  const urls = s.assets
    .map((a) => a.url)
    .filter(Boolean)
    .sort();
  assert.deepEqual(urls, ["https://example.com/dir/a.svg", "https://example.com/dir/b.svg"]);
  assert.ok(
    s.assets.some((a) => a.markup),
    "data URI candidate decoded",
  );
});

test("#26 src and data-src naming the same file count once", () => {
  const s = X(`<img src="a.svg" data-src="./a.svg">`);
  assert.equal(s.assets[0].occurrences, 1);
});

test("#27 commented-out CSS is not a reference", () => {
  assert.equal(
    X(`<style>/* .gone {background:url(gone.svg)} */ .x{background:url(real.svg)}</style>`).assets.length,
    1,
  );
});

test("#28 id lookups do not scan the document per reference (large page stays fast)", () => {
  const html =
    Array.from({ length: 30000 }, (_, i) => `<div id="n${i}">x</div>`).join("") +
    "<svg><defs>" +
    Array.from({ length: 300 }, (_, i) => `<symbol id="s${i}"><path d="M0 0h${i}v10z"/></symbol>`).join("") +
    "</defs></svg>" +
    Array.from({ length: 400 }, (_, i) => `<svg><g><use href="#s${i % 300}"/></g></svg>`).join("");
  const t0 = performance.now();
  extractSvgs(doc(html), PAGE, { maxAssets: 10 });
  const ms = performance.now() - t0;
  assert.ok(ms < 1500, `took ${ms.toFixed(0)}ms`);
});

test("#29 #30 thumbnail theming: spaced attributes and a leading comment", () => {
  const t1 = themedThumbnail(`<svg xmlns="http://www.w3.org/2000/svg" fill = "red" color = "blue"><path/></svg>`);
  const d1 = decodeURIComponent(t1.dark.slice(t1.dark.indexOf(",") + 1));
  assert.equal((d1.match(/\sfill\s*=/g) ?? []).length, 1);
  assert.equal((d1.match(/\scolor\s*=/g) ?? []).length, 1);
  const t2 = themedThumbnail(`<!-- <svg> --><svg xmlns="http://www.w3.org/2000/svg"><path/></svg>`);
  const d2 = decodeURIComponent(t2.dark.slice(t2.dark.indexOf(",") + 1));
  assert.match(d2, /--><svg color=/);
});

test("#31 bytes is the UTF-8 size of the markup", () => {
  const raw = `<svg xmlns="http://www.w3.org/2000/svg"><text>漢😀</text></svg>`;
  const s = X(`<img src="data:image/svg+xml,${encodeURIComponent(raw)}">`);
  assert.equal(s.assets[0].bytes, Buffer.byteLength(s.assets[0].markup!, "utf8"));
});

test("D2 SVGs the dig found in metadata reach the grid; ones the scan also finds are not doubled", () => {
  const s = extractSvgs(doc("", `<link rel="icon" href="/fav.svg">`), PAGE, {
    maxAssets: 99,
    known: [{ url: "https://example.com/og.svg" }, { url: "https://example.com/fav.svg" }],
  });
  assert.deepEqual(s.assets.map((a) => `${a.source}:${a.url}`).sort(), [
    "favicon:https://example.com/fav.svg",
    "meta:https://example.com/og.svg",
  ]);
  assert.equal(s.assets.find((a) => a.source === "favicon")!.occurrences, 1);
});

// ---- Codex view review (2026-09-29 07:24) ----
test("V4 parseSvgDocument: an HTML page that merely contains an icon is not an SVG file", () => {
  assert.equal(parseSvgDocument(`<!doctype html><html><body><svg><path d="M0 0"/></svg></body></html>`), undefined);
  assert.ok(parseSvgDocument(`<svg/>`), "a bare self-closing root is an SVG");
  const withProlog = parseSvgDocument(
    `<?xml version="1.0"?><!-- made by x --><svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>`,
  );
  assert.ok(withProlog);
  assertWellFormedXml(withProlog!);
});

test("V7 rebuilt external symbols resolve relative references against the sprite file", () => {
  const file = `<svg xmlns="http://www.w3.org/2000/svg"><symbol id="a"><image href="./art/logo.png"/><use href="other.svg#b"/></symbol></svg>`;
  const [a] = rebuildSpriteSymbols(file, "https://example.com/icons/sprite.svg", { a: 1 });
  assert.match(a.markup!, /href="https:\/\/example\.com\/icons\/art\/logo\.png"/);
  assert.match(a.markup!, /href="https:\/\/example\.com\/icons\/other\.svg#b"/);
});

const sym = (key: string, occ: number, bytes = 10) => ({
  key,
  source: "sprite" as const,
  name: key,
  markup: "<svg/>",
  bytes,
  occurrences: occ,
});

test("V2 merging external sprites is pure: the same inputs give the same counts, inputs untouched", () => {
  const page = [sym("p", 1)];
  const ext = [sym("x", 1), sym("x", 1)];
  const first = mergeExternalSprites(page, ext, 100);
  const second = mergeExternalSprites(page, ext, 100);
  assert.equal(first.assets.find((a) => a.key === "x")!.occurrences, 2);
  assert.equal(second.assets.find((a) => a.key === "x")!.occurrences, 2);
  assert.deepEqual(
    ext.map((a) => a.occurrences),
    [1, 1],
  );
  assert.equal(page[0].occurrences, 1);
});

test("V3 the asset cap applies after merging, and truncation reflects the merged list", () => {
  const page = Array.from({ length: 3 }, (_, i) => sym(`p${i}`, 1, 100 - i));
  const merged = mergeExternalSprites(page, [sym("x", 1, 1)], 3);
  assert.equal(merged.assets.length, 3);
  assert.equal(merged.truncated, true);
  const fits = mergeExternalSprites(page.slice(0, 1), [sym("x", 1, 1)], 3);
  assert.equal(fits.truncated, false);
});

// ---- Preview backdrop + Quick Look (ported from Central Icons) ----
const WIDE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 71"><path fill="currentColor" d="M0 0h140v71z"/><path d="M1 1"/></svg>`;

test("withBackdrop: a square canvas filled edge to edge, the artwork centered at its own aspect", () => {
  const out = withBackdrop(WIDE, "black")!;
  const outer = /^<svg[^>]*viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(out)!;
  assert.equal(outer[1], outer[2], "square canvas");
  const side = Number(outer[1]);
  assert.match(out, new RegExp(`<rect x="0" y="0" width="${side}" height="${side}" fill="#000000"/>`));
  const inner = /<svg x="([\d.]+)" y="([\d.]+)" width="140" height="71" viewBox="0 0 140 71"/.exec(out)!;
  assert.ok(inner, out.slice(0, 300));
  assert.ok(Math.abs(Number(inner[1]) * 2 + 140 - side) < 0.01, "centered horizontally");
  assert.ok(Math.abs(Number(inner[2]) * 2 + 71 - side) < 0.01, "centered vertically");
  assertWellFormedXml(out);
});

test("withBackdrop: ink contrasts with the backdrop — currentColor and unset fills", () => {
  const onBlack = withBackdrop(WIDE, "black")!;
  assert.doesNotMatch(onBlack, /currentColor/);
  assert.match(onBlack, /fill="#FFFFFF" d="M0 0h140v71z"/);
  assert.match(onBlack, /<svg x=[^>]* fill="#FFFFFF"/, "the artwork root supplies the unset-fill default");
  const onWhite = withBackdrop(WIDE, "white")!;
  assert.match(onWhite, /fill="#000000" d="M0 0h140v71z"/);
});

test("withBackdrop: an author's own colors are never repainted", () => {
  const brand = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" fill="#ff5a5f"><path fill="#123456" d="M0 0"/></svg>`;
  const out = withBackdrop(brand, "black")!;
  assert.match(out, /fill="#ff5a5f"/);
  assert.match(out, /fill="#123456"/);
});

test("withBackdrop: width/height stand in for a missing viewBox; none means no backdrop", () => {
  const sized = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="12"><rect width="24" height="12"/></svg>`;
  assert.match(withBackdrop(sized, "gray")!, /<svg x="[\d.]+" y="[\d.]+" width="24" height="12" viewBox="0 0 24 12"/);
  assert.equal(withBackdrop(sized, "none"), undefined);
});

test("quickLookMarkup resolves currentColor to the appearance's ink and leaves the rest alone", () => {
  const dark = quickLookMarkup(WIDE, "dark");
  assert.doesNotMatch(dark, /currentColor/);
  assert.match(dark, /fill="#FFFFFF"/);
  assert.match(quickLookMarkup(WIDE, "light"), /fill="#000000"/);
  assertWellFormedXml(dark);
});

// ---- Page CSS variables do not travel with an exported SVG ----
test("var() whose variable the page defines resolves to its fallback (Stripe's logo pattern)", () => {
  const s = X(
    `<svg viewBox="0 0 9 9" fill="none"><path fill="var(--caseStudyLogoColor, #000)" d="M0 0"/><path style="stroke: var(--a, var(--b, rgb(1, 2, 3)))" d="M1 1"/></svg>`,
  );
  const m = s.assets[0].markup!;
  assert.match(m, /fill="#000"/);
  assert.match(m, /stroke: rgb\(1, 2, 3\)/);
  assert.doesNotMatch(m, /var\(/);
  assertWellFormedXml(m);
});

test("a variable the SVG declares itself stays live; one with no fallback is left as-is", () => {
  const s = X(
    `<svg viewBox="0 0 9 9" style="--brand: red"><style>.a{fill:var(--brand, blue)}</style><path class="a" d="M0 0"/><path fill="var(--unknown)" d="M1 1"/></svg>`,
  );
  const m = s.assets[0].markup!;
  assert.match(m, /var\(--brand, blue\)/);
  assert.match(m, /fill="var\(--unknown\)"/);
});

test("data-URI and sprite paths resolve page variables too", () => {
  const raw = `<svg xmlns="http://www.w3.org/2000/svg"><path fill="var(--x, #abc)" d="M0 0"/></svg>`;
  assert.match(X(`<img src="data:image/svg+xml,${encodeURIComponent(raw)}">`).assets[0].markup!, /fill="#abc"/);
  const file = `<svg xmlns="http://www.w3.org/2000/svg"><symbol id="a"><path fill="var(--y, #def)" d="M0 0"/></symbol></svg>`;
  assert.match(rebuildSpriteSymbols(file, "https://e.com/s.svg", { a: 1 })[0].markup!, /fill="#def"/);
});

// ---- Codex (gpt-5.5) 2026-09-29: rewrites are CSS-only ----
test("text content that looks like CSS is left verbatim", () => {
  const s = X(
    `<svg viewBox="0 0 200 20"><text y="15">var(--brand-name, Acme)</text><text id="currentColor">currentColor</text></svg>`,
  );
  const m = s.assets[0].markup!;
  assert.match(m, /<text y="15">var\(--brand-name, Acme\)<\/text>/);
  const back = withBackdrop(m, "black")!;
  assert.match(back, />currentColor<\/text>/);
  assert.match(back, /id="currentColor"/);
  assert.match(quickLookMarkup(m, "dark"), />currentColor<\/text>/);
});

test("only real CSS declarations count as declared, not a title that mentions one", () => {
  const s = X(
    `<svg viewBox="0 0 10 10"><title>Brand token --logo-fill: documented here</title><path fill="var(--logo-fill, #000)" d="M0 0h10v10H0z"/></svg>`,
  );
  assert.match(s.assets[0].markup!, /fill="#000"/);
});

test("CSS contexts still resolve: attributes, style attributes, <style> text", () => {
  const s = X(
    `<svg viewBox="0 0 9 9"><style>.a{fill:var(--p, red)}</style><path class="a" style="stroke:currentColor" fill="currentColor" d="M0 0"/></svg>`,
  );
  const m = s.assets[0].markup!;
  assert.match(m, /\.a\{fill:red\}/);
  const q = quickLookMarkup(m, "dark");
  assert.match(q, /style="stroke:#FFFFFF"/);
  assert.match(q, /fill="#FFFFFF"/);
});

// ---- Display copies never reach the network (Codex image-guard review) ----
const HOSTILE =
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 10 10" onload="alert(1)">` +
  `<script>fetch("http://169.254.169.254/")</script>` +
  `<style>@import url("https://evil.test/a.css"); .a{fill:url(https://evil.test/x.svg#p)} .b{fill:url(#grad)}</style>` +
  `<defs><linearGradient id="grad"/></defs>` +
  `<image href="http://169.254.169.254/latest/meta-data/" width="1" height="1"/>` +
  `<image xlink:href="data:image/png;base64,AAAA" width="1" height="1"/>` +
  `<use href="https://evil.test/sprite.svg#a"/><use href="#grad"/>` +
  `<rect style="fill:url('https://evil.test/p.svg')" width="1" height="1"/>` +
  `<foreignObject><div xmlns="http://www.w3.org/1999/xhtml"><img src="http://evil.test/i.png"/></div></foreignObject>` +
  `<path fill="url(#grad)" onclick="x()" d="M0 0"/></svg>`;

test("displaySafe strips scripts, handlers, foreignObject, and every external reference", () => {
  const out = displaySafe(HOSTILE);
  assert.doesNotMatch(out, /<script/i);
  assert.doesNotMatch(out, /\son\w+\s*=/i);
  assert.doesNotMatch(out, /<foreignObject/i);
  assert.doesNotMatch(out, /@import/i);
  assert.doesNotMatch(out.replace(/xmlns(:\w+)?="[^"]*"/g, ""), /https?:|169\.254/i);
  assertWellFormedXml(out);
});

test("displaySafe keeps in-file references and data URIs, so the picture still draws", () => {
  const out = displaySafe(HOSTILE);
  assert.match(out, /fill="url\(#grad\)"/);
  assert.match(out, /\.b\{fill:url\(#grad\)\}/);
  assert.match(out, /<use href="#grad"/);
  assert.match(out, /xlink:href="data:image\/png;base64,AAAA"/);
  assert.match(out, /<linearGradient id="grad"/);
});

test("displaySafe leaves an ordinary SVG unchanged", () => {
  const plain = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 9"><path fill="#123" d="M0 0h9v9z"/></svg>`;
  assert.equal(displaySafe(plain), plain);
});

// ---- Codex sanitizer review: five bypasses of the regex version ----
const noExternal = (out: string) => {
  const body = out.replace(/\sxmlns(:[\w-]+)?="[^"]*"/g, "");
  assert.doesNotMatch(body, /https?:|169\.254|\/\/evil/i, out);
};

test("bypass 1: processing instructions inside the SVG are removed", () => {
  const out = displaySafe(
    `<svg xmlns="http://www.w3.org/2000/svg"><?xml-stylesheet href="http://169.254.169.254/x.css"?><rect/></svg>`,
  );
  assert.doesNotMatch(out, /<\?/);
  noExternal(out);
});

test("bypass 2: a nested SVG data URI is sanitized, not waved through", () => {
  const inner = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg"><image href="http://169.254.169.254/x.png"/><rect width="1" height="1"/></svg>`,
  );
  const out = displaySafe(`<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/svg+xml,${inner}"/></svg>`);
  const kept = /href="(data:image\/svg\+xml,[^"]*)"/.exec(out)?.[1];
  if (kept) noExternal(decodeURIComponent(kept.slice(kept.indexOf(",") + 1)));
  noExternal(out);
});

test("bypass 3 and 5: unquoted event handlers, hrefs and styles are handled", () => {
  const out = displaySafe(
    `<svg xmlns="http://www.w3.org/2000/svg" onload=alert(1)><image href=http://169.254.169.254/x.png /><rect style=background:url(http://169.254.169.254/a.png) /></svg>`,
  );
  assert.doesNotMatch(out, /onload/i);
  noExternal(out);
  assertWellFormedXml(out);
});

test("bypass 4: CSS escapes and comments cannot disguise url() or @import", () => {
  const out = displaySafe(
    `<svg xmlns="http://www.w3.org/2000/svg"><style>@im\\70ort "http://evil.test/a.css"; .x{fill:u\\72l(http://169.254.169.254/a.svg#id)} .y{fill:url/**/(http://evil.test/b.svg)} .z{background:image-set("http://evil.test/c.png" 1x)}</style><rect class="x"/></svg>`,
  );
  noExternal(out);
  assert.doesNotMatch(out, /@import/i);
});

test("animation that retargets href is removed; other animation stays", () => {
  const out = displaySafe(
    `<svg xmlns="http://www.w3.org/2000/svg"><use href="#a"><set attributeName="href" to="http://evil.test/x.svg#a"/></use><rect><animate attributeName="opacity" values="0;1" dur="1s"/></rect></svg>`,
  );
  assert.doesNotMatch(out, /<set/);
  assert.match(out, /<animate attributeName="opacity"/);
  noExternal(out);
});

// ---- Codex pass 2 on the rebuilt sanitizer: namespace prefixes ----
test("prefixed script elements are removed, whatever the prefix", () => {
  for (const input of [
    `<svg xmlns="http://www.w3.org/2000/svg"><svg:script xmlns:svg="http://www.w3.org/2000/svg">alert(1)</svg:script></svg>`,
    `<svg xmlns="http://www.w3.org/2000/svg"><s:SCRIPT xmlns:s="http://www.w3.org/2000/svg">alert(1)</s:SCRIPT></svg>`,
  ]) {
    assert.doesNotMatch(displaySafe(input), /script|alert/i, input);
  }
});

test("prefixed or space-padded href animation is removed", () => {
  const a = displaySafe(
    `<svg xmlns="http://www.w3.org/2000/svg"><image id="i"/><svg:animate xmlns:svg="http://www.w3.org/2000/svg" href="#i" attributeName="href" values="http://evil/a.png"/></svg>`,
  );
  assert.doesNotMatch(a, /animate|evil/i);
  const b = displaySafe(
    `<svg xmlns="http://www.w3.org/2000/svg"><image id="i"/><animate href="#i" attributeName=" href " values="http://evil/a.png"/></svg>`,
  );
  assert.doesNotMatch(b, /animate|evil/i);
});

test("a prefixed <style> is still cleaned, and a prefixed event handler still goes", () => {
  const out = displaySafe(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:ev="http://www.w3.org/2001/xml-events" ev:onload="x()"><s:style xmlns:s="http://www.w3.org/2000/svg">.a{fill:url(http://evil/x.svg)}</s:style></svg>`,
  );
  assert.doesNotMatch(out, /onload|evil/i);
});

// ---- Allowlist, not blocklist (seeded from DOMPurify 3.4.16's SVG lists) ----
test("elements not on the SVG allowlist are removed — including ones no blocklist named", () => {
  const out = displaySafe(
    `<svg xmlns="http://www.w3.org/2000/svg"><discard/><handler/><video src="x"/><x-widget><rect id="inside"/></x-widget>` +
      `<font-face><font-face-uri href="http://evil/f.svg"/></font-face><rect id="kept"/></svg>`,
  );
  for (const gone of ["discard", "handler", "video", "x-widget", "font-face", "inside", "evil"]) {
    assert.doesNotMatch(out, new RegExp(gone), `${gone} survived: ${out}`);
  }
  assert.match(out, /<rect id="kept"\/>/);
});

test("the artwork elements real SVGs use all survive", () => {
  const art =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 9"><title>t</title><desc>d</desc><defs>` +
    `<linearGradient id="g"><stop offset="0"/></linearGradient><radialGradient id="r"/><clipPath id="c"><rect/></clipPath>` +
    `<mask id="m"><rect/></mask><pattern id="p"/><marker id="k"/><symbol id="s"><path d="M0 0"/></symbol>` +
    `<filter id="f"><feGaussianBlur stdDeviation="1"/><feBlend/><feFlood/><feOffset/><feMerge><feMergeNode/></feMerge></filter></defs>` +
    `<g><circle r="1"/><ellipse/><line/><polyline/><polygon/><text><tspan>x</tspan><textPath href="#s">y</textPath></text>` +
    `<use href="#s"/><image href="data:image/png;base64,AAAA"/><switch><g/></switch><a href="#s"><rect/></a>` +
    `<rect><animate attributeName="opacity" values="0;1"/><animateTransform attributeName="transform" type="rotate"/><set attributeName="fill" to="red"/></rect></g></svg>`;
  const out = displaySafe(art);
  for (const kept of [
    "title",
    "desc",
    "linearGradient",
    "radialGradient",
    "clipPath",
    "mask",
    "pattern",
    "marker",
    "symbol",
    "feGaussianBlur",
    "feMergeNode",
    "circle",
    "ellipse",
    "polyline",
    "polygon",
    "tspan",
    "textPath",
    "<use",
    "<image",
    "switch",
    "<a ",
    "<animate ",
    "animateTransform",
    "<set ",
  ]) {
    assert.ok(out.includes(kept), `${kept} was dropped`);
  }
});

// ---- Greptile round 1 on #31769 ----
test("G2: a non-symbol sprite part keeps the sprite file's coordinate system", () => {
  const file = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><g id="shape"><path d="M2 2h20v20H2z"/></g></svg>`;
  const [a] = rebuildSpriteSymbols(file, "https://e.com/s.svg", { shape: 1 });
  assert.match(a.markup!, /^<svg[^>]*viewBox="0 0 24 24"/);
  assertWellFormedXml(a.markup!);
});

test("G3: a quoted SVG data URI inside CSS is sanitized too, not kept verbatim", () => {
  const inner = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg"><image href="http://169.254.169.254/x.png"/></svg>`,
  );
  const out = displaySafe(
    `<svg xmlns="http://www.w3.org/2000/svg"><rect style="background:image-set(&quot;data:image/svg+xml,${inner}&quot; 1x)"/></svg>`,
  );
  const decoded = decodeURIComponent(out);
  assert.doesNotMatch(decoded.replace(/xmlns(:[\w-]+)?="[^"]*"/g, ""), /169\.254|http:/);
  assert.match(out, /data:image\/png|data:image\/svg\+xml/, "the image itself is kept, sanitized");
});

test("G7: relative CSS url() in an inline SVG is made absolute for export", () => {
  const s = X(
    `<svg viewBox="0 0 9 9"><style>.a{fill:url(./paint.svg#g)}</style><rect style="fill:url('img/p.png')" filter="url(fx.svg#f)" class="a"/><rect fill="url(#local)"/></svg>`,
  );
  const m = s.assets[0].markup!;
  assert.match(m, /url\(https:\/\/example\.com\/dir\/paint\.svg#g\)/);
  assert.match(m, /url\((?:'|&apos;)https:\/\/example\.com\/dir\/img\/p\.png(?:'|&apos;)\)/);
  assert.match(m, /filter="url\(https:\/\/example\.com\/dir\/fx\.svg#f\)"/);
  assert.match(m, /fill="url\(#local\)"/, "in-file references stay relative");
});

test("G8: an external part used inside a symbol is counted by that symbol's uses", () => {
  const unused = X(`<svg style="display:none"><symbol id="s"><use href="other.svg#part"/></symbol></svg>`);
  assert.deepEqual([...unused.externalSprites[0].ids], ["part"], "still fetched, so it can be rebuilt");
  assert.equal(unused.externalSprites[0].uses["part"], 0, "but not counted as used");
  const used = X(
    `<svg style="display:none"><symbol id="s"><use href="other.svg#part"/></symbol></svg><svg><use href="#s"/></svg><svg><use href="#s"/></svg>`,
  );
  assert.equal(used.externalSprites[0].uses["part"], 2, "used as often as its symbol is");
});

/**
 * Tests for the Central Icons component→SVG parser.
 *
 * Run: node --test scripts/parse-central-icons.test.mjs
 *
 * Fixtures are verbatim excerpts of published `@central-icons-react` module
 * sources (v1.1.298), trimmed only of the shared base component that precedes
 * every icon.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseIconModule, __testing } from "./parse-central-icons.mjs";

const { parseProps, splitArgs, escapeAttr } = __testing;

/** Outlined IconHome — the simple single-path case. */
const OUTLINED_HOME = `var h=s.memo((r)=>{return s.createElement(m,{...r,ariaLabel:"home, house",maskId:"round-outlined-radius-2-stroke-1.5-IconHome"},s.createElement("path",{d:"M3.75 9.77L4 5Z",stroke:"currentColor",strokeWidth:"1.5",strokeLinejoin:"round"}))}),w=h;export{w as default,h as IconHome};`;

/** Filled IconHome — different geometry, fill instead of stroke. */
const FILLED_HOME = `var u=l.memo((r)=>{return l.createElement(m,{...r,ariaLabel:"home, house",maskId:"round-filled-radius-2-stroke-1.5-IconHome"},l.createElement("path",{fillRule:"evenodd",clipRule:"evenodd",d:"M10.26 1.96Z",fill:"currentColor"}))}),x=u;export{x as default,u as IconHome};`;

/** IconEyeSlash2 — the nested <g clipPath> + <defs><clipPath> case. */
const CLIPPED = `var C=r.memo((o)=>{return r.createElement(m,{...o,ariaLabel:"eye-slash, hide",maskId:"round-outlined-radius-2-stroke-1.5-IconEyeSlash2"},r.createElement("g",{clipPath:"url(#clip0_7101_62915)"},r.createElement("path",{d:"M9.38 5.14Z",stroke:"currentColor",strokeWidth:"1.5"}),r.createElement("path",{d:"M2.75 2.75L21.25 21.25",stroke:"currentColor",strokeWidth:"1.5"})),r.createElement("defs",null,r.createElement("clipPath",{id:"clip0_7101_62915"},r.createElement("rect",{width:"24",height:"24",fill:"white"}))))}),y=C;export{y as default,C as IconEyeSlash2};`;

test("extracts a single-path outlined icon", () => {
  const { svg, aliases } = parseIconModule(OUTLINED_HOME, { name: "IconHome" });
  assert.equal(
    svg,
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">' +
      '<path d="M3.75 9.77L4 5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>' +
      "</svg>",
  );
  assert.deepEqual(aliases, ["home", "house"]);
});

test("camelCase props become kebab-case SVG attributes", () => {
  const { svg } = parseIconModule(FILLED_HOME, { name: "IconHome" });
  assert.match(svg, /fill-rule="evenodd"/);
  assert.match(svg, /clip-rule="evenodd"/);
  assert.doesNotMatch(svg, /fillRule/);
  assert.doesNotMatch(svg, /clipRule/);
});

test("filled and outlined variants yield different geometry", () => {
  const outlined = parseIconModule(OUTLINED_HOME, { name: "IconHome" }).svg;
  const filled = parseIconModule(FILLED_HOME, { name: "IconHome" }).svg;
  assert.notEqual(outlined, filled);
  assert.match(outlined, /stroke="currentColor"/);
  assert.match(filled, /fill="currentColor"/);
});

test("preserves <g clipPath> nesting and the matching <defs>", () => {
  const { svg } = parseIconModule(CLIPPED, { name: "IconEyeSlash2" });

  // The group must WRAP its paths, not sit as a sibling.
  assert.match(svg, /<g clip-path="url\(#clip0_7101_62915\)"><path[^>]*\/><path[^>]*\/><\/g>/);

  // The clipPath definition must survive, or the reference dangles.
  assert.match(svg, /<defs><clipPath id="clip0_7101_62915"><rect[^>]*\/><\/clipPath><\/defs>/);

  // Both paths present, in source order.
  assert.equal((svg.match(/<path/g) || []).length, 2);
  assert.ok(svg.indexOf("M9.38 5.14Z") < svg.indexOf("M2.75 2.75"));
});

test("a clipPath reference always has a definition to point at", () => {
  const { svg } = parseIconModule(CLIPPED, { name: "IconEyeSlash2" });
  const refs = [...svg.matchAll(/clip-path="url\(#([^)]+)\)"/g)].map((m) => m[1]);
  const defs = [...svg.matchAll(/<clipPath id="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(refs.length > 0, "fixture should exercise a clip reference");
  for (const ref of refs) assert.ok(defs.includes(ref), `dangling clip reference ${ref}`);
});

test("rejects a module with no maskId marker", () => {
  assert.throws(() => parseIconModule("export const nope = 1;", { name: "Bogus" }), /No maskId marker/);
});

test("rejects markup with no drawable geometry", () => {
  const empty = `x.memo(()=>e.createElement(m,{maskId:"s-IconVoid"},e.createElement("defs",null,e.createElement("clipPath",{id:"c"}))))`;
  assert.throws(() => parseIconModule(empty, { name: "IconVoid" }), /no drawable geometry/);
});

test("refuses to guess at a non-string prop value", () => {
  assert.throws(() => parseProps('{d:"M0 0Z",fill:someVar}', 0), /Non-string value/);
});

test("splitArgs ignores commas inside strings and nested calls", () => {
  const parts = splitArgs('"path",{d:"M0,0 L1,1"},e.createElement("g",{a:"b"})');
  assert.equal(parts.length, 3);
  assert.equal(parts[0], '"path"');
  assert.match(parts[1], /^\{d:"M0,0 L1,1"\}$/);
});

test("escapes XML metacharacters in attribute values", () => {
  assert.equal(escapeAttr('a<b>c&d"e'), "a&lt;b&gt;c&amp;d&quot;e");
});

test("aliases are trimmed and empty entries dropped", () => {
  const src = OUTLINED_HOME.replace('ariaLabel:"home, house"', 'ariaLabel:"home,  house , ,x"');
  const { aliases } = parseIconModule(src, { name: "IconHome" });
  assert.deepEqual(aliases, ["home", "house", "x"]);
});

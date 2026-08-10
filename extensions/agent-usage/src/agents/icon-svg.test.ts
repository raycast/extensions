import test from "node:test";
import assert from "node:assert/strict";
import { invertMonochromeSvg, isMonochromeSvg, scaleSvgViewBox } from "./icon-svg.ts";

test("isMonochromeSvg accepts black fill icons", () => {
  const svg = `<svg fill="#000" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>`;
  assert.equal(isMonochromeSvg(svg), true);
});

test("isMonochromeSvg treats paint-less SVGs as monochrome (implicit black fill)", () => {
  const svg = `<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>`;
  assert.equal(isMonochromeSvg(svg), true);
});

test("isMonochromeSvg accepts currentColor icons", () => {
  const svg = `<svg fill="currentColor" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>`;
  assert.equal(isMonochromeSvg(svg), true);
});

test("isMonochromeSvg accepts synthetic-style black/white stroke+fill", () => {
  const svg = `
    <svg viewBox="0 0 800 800" fill="none">
      <path d="M0 0" stroke="black" stroke-width="2"/>
      <path d="M1 1" fill="white" stroke="black"/>
      <clipPath id="c"><rect width="800" height="800" fill="white"/></clipPath>
    </svg>
  `;
  assert.equal(isMonochromeSvg(svg), true);
});

test("isMonochromeSvg rejects brand-colored icons", () => {
  const svg = `<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="#D97757"/></svg>`;
  assert.equal(isMonochromeSvg(svg), false);
});

test("isMonochromeSvg rejects multi-color brand icons", () => {
  const svg = `
    <svg viewBox="0 0 21 21">
      <path d="M0 0" fill="#F34E3F"/>
      <path d="M1 1" fill="#F34E3F"/>
    </svg>
  `;
  assert.equal(isMonochromeSvg(svg), false);
});

test("invertMonochromeSvg swaps black and white paints", () => {
  const svg = `<svg fill="#000" viewBox="0 0 24 24"><path fill="white" stroke="black" d="M0 0"/></svg>`;
  const inverted = invertMonochromeSvg(svg);
  assert.equal(inverted, `<svg fill="#fff" viewBox="0 0 24 24"><path fill="#000" stroke="#fff" d="M0 0"/></svg>`);
});

test("invertMonochromeSvg maps currentColor to white for dark mode", () => {
  const svg = `<svg fill="currentColor" viewBox="0 0 24 24"><path d="M0 0"/></svg>`;
  const inverted = invertMonochromeSvg(svg);
  assert.equal(inverted, `<svg fill="#fff" viewBox="0 0 24 24"><path d="M0 0"/></svg>`);
});

test("invertMonochromeSvg returns null for brand-colored icons", () => {
  const svg = `<svg viewBox="0 0 24 24"><path fill="#D97757" d="M0 0"/></svg>`;
  assert.equal(invertMonochromeSvg(svg), null);
});

test("invertMonochromeSvg injects white root fill for paint-less icons", () => {
  const svg = `<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>`;
  const inverted = invertMonochromeSvg(svg);
  assert.equal(inverted, `<svg fill="#fff" viewBox="0 0 24 24"><path d="M0 0"/></svg>`);
});

test("scaleSvgViewBox expands viewBox to shrink the glyph", () => {
  const svg = `<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>`;
  const scaled = scaleSvgViewBox(svg, 0.8);
  assert.match(scaled, /viewBox="-3 -3 30 30"/);
});

test("scaleSvgViewBox is a no-op at scale 1", () => {
  const svg = `<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>`;
  assert.equal(scaleSvgViewBox(svg, 1), svg);
});

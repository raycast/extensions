import assert from "node:assert/strict";
import * as fs from "node:fs";
import test from "node:test";

import {
  DARK_MODE_INVERTED_LIST_ICONS,
  getDarkListIconAssetName,
  invertSvgColors,
  invertMonochromeSvg,
  isMonochromeSvg,
  scaleSvgViewBox,
  selectSourceForAppearance,
  shouldInvertListIcon,
} from "./icon-svg.ts";

test("dark-mode list icon allowlist contains exactly the requested agents", () => {
  assert.deepEqual(DARK_MODE_INVERTED_LIST_ICONS, [
    "clinepass-icon.svg",
    "codex-icon.svg",
    "copilot-icon.svg",
    "cursor-icon.svg",
    "droid-icon.svg",
    "grok-icon.svg",
    "opencode-go-icon.svg",
    "synthetic-icon.svg",
    "zai-icon.svg",
  ]);

  for (const assetName of DARK_MODE_INVERTED_LIST_ICONS) {
    assert.equal(shouldInvertListIcon(assetName), true);
  }
  assert.equal(shouldInvertListIcon("claude-icon.svg"), false);
});

test("selectSourceForAppearance bypasses theme-pair selection", () => {
  assert.equal(selectSourceForAppearance("light.svg", "dark.svg", "light"), "light.svg");
  assert.equal(selectSourceForAppearance("light.svg", "dark.svg", "dark"), "dark.svg");
});

test("packaged dark list icons are exact color inversions of their light assets", () => {
  for (const assetName of DARK_MODE_INVERTED_LIST_ICONS) {
    const lightPath = new URL(`../../assets/${assetName}`, import.meta.url);
    const darkPath = new URL(`../../assets/${getDarkListIconAssetName(assetName)}`, import.meta.url);
    assert.equal(
      fs.readFileSync(darkPath, "utf-8").trimEnd(),
      invertSvgColors(fs.readFileSync(lightPath, "utf-8")).trimEnd(),
    );
  }
});

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

test("isMonochromeSvg treats gradient fills as colored even when the glyph is white", () => {
  const svg = `
    <svg viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="url(#g)"/>
      <path fill="white" d="M0 0"/>
    </svg>
  `;
  assert.equal(isMonochromeSvg(svg), false);
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

test("invertSvgColors inverts ClinePass near-black for its dark list variant", () => {
  const svg = `<svg fill="none"><path fill="#18181B" d="M0 0"/></svg>`;
  assert.equal(invertSvgColors(svg), `<svg fill="none"><path fill="#e7e7e4" d="M0 0"/></svg>`);
});

test("invertSvgColors preserves transparent paints and swaps black and white", () => {
  const svg = `<svg fill="none"><path fill="white" stroke="black" d="M0 0"/></svg>`;
  assert.equal(invertSvgColors(svg), `<svg fill="none"><path fill="#000" stroke="#fff" d="M0 0"/></svg>`);
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

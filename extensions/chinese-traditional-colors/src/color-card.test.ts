import test from "node:test";
import assert from "node:assert/strict";
import { colorSwatchSvg, paletteReferencesCardSvg } from "./color-card";
import type { ColorReference, TraditionalColor } from "./types";

const references: ColorReference[] = [
  { number: "001", name: "乳白", hex: "#F9F4DC" },
  { number: "053", name: "蚌肉白", hex: "#F9F1DB" },
  { number: "576", name: "绀青", hex: "#4F84FF" },
];

const color: TraditionalColor = {
  number: "001",
  name: "乳白",
  pinyin: "Ru Bai",
  pinyinCompact: "rubai",
  hex: "#F9F4DC",
  hsl: { h: 50, s: 71, l: 92 },
  hueCategory: "黄色系",
  temperature: "暖",
  palettes: {
    similar: [],
    analogous: [],
    complementary: [],
    splitComplementary: [],
    triadic: [],
    tetradic: [],
    temperatureContrast: [],
    light: [],
    dark: [],
    muted: [],
    neutral: [],
    secondary: [],
    accent: [],
  },
  main: references[0],
  secondary: [references[1]],
  accent: [references[2]],
  schemeText: "",
};

test("builds a data URI SVG for a single swatch", () => {
  const svg = colorSwatchSvg(color);

  assert.ok(svg.startsWith("data:image/svg+xml;utf8,"));
  assert.ok(svg.includes("%23F9F4DC"));
  assert.ok(svg.includes("%E4%B9%B3%E7%99%BD"));
});

test("builds palette cards from arbitrary references", () => {
  const svg = paletteReferencesCardSvg("同类色 / Similar", references);

  assert.ok(svg.includes("%E5%90%8C%E7%B1%BB%E8%89%B2%20%2F%20Similar"));
  assert.ok(svg.includes("%23F9F1DB"));
});

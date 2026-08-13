import test from "node:test";
import assert from "node:assert/strict";
import {
  formatCssHsl,
  formatCssRgb,
  formatCssVariable,
  formatHsl,
  formatJson,
  formatRgb,
  hexToRgb,
} from "./color-format";
import type { TraditionalColor } from "./types";

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
  main: { number: "001", name: "乳白", hex: "#F9F4DC" },
  secondary: [],
  accent: [],
  schemeText: "",
};

test("converts HEX to RGB channels", () => {
  assert.deepEqual(hexToRgb("#F9F4DC"), { r: 249, g: 244, b: 220 });
});

test("formats common color strings", () => {
  assert.equal(formatRgb(color), "249, 244, 220");
  assert.equal(formatCssRgb(color), "rgb(249 244 220)");
  assert.equal(formatHsl(color), "50, 71%, 92%");
  assert.equal(formatCssHsl(color), "hsl(50 71% 92%)");
});

test("formats CSS variables with a stable slug", () => {
  assert.equal(formatCssVariable(color), "--ctc-001: #F9F4DC;");
});

test("formats compact JSON for export", () => {
  assert.equal(
    formatJson(color),
    JSON.stringify({ number: "001", name: "乳白", hex: "#F9F4DC", rgb: "249, 244, 220", hsl: "50, 71%, 92%" }),
  );
});

import test from "node:test";
import assert from "node:assert/strict";
import { getColorCopyValue } from "./copy-format";
import type { TraditionalColor } from "./types";

const color: TraditionalColor = {
  number: "001",
  name: "乳白",
  pinyin: "ru bai",
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

test("returns the configured default copy value", () => {
  assert.equal(getColorCopyValue(color, "hex"), "#F9F4DC");
  assert.equal(getColorCopyValue(color, "rgb"), "249, 244, 220");
  assert.equal(getColorCopyValue(color, "cssRgb"), "rgb(249 244 220)");
  assert.equal(getColorCopyValue(color, "cssVariable"), "--ctc-001: #F9F4DC;");
});

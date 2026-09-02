import test from "node:test";
import assert from "node:assert/strict";
import { filterColors, getHueCategories, getSearchKeywords, sortColorsByHueCategory } from "./search";
import type { TraditionalColor } from "./types";

const colors: TraditionalColor[] = [
  {
    number: "001",
    name: "乳白",
    pinyin: "Ru Bai",
    pinyinCompact: "rubai",
    hex: "#F9F4DC",
    hsl: { h: 50, s: 71, l: 92 },
    hueCategory: "黄色系",
    temperature: "暖",
    palettes: {
      similar: [{ number: "053", name: "蚌肉白", hex: "#F9F1DB" }],
      analogous: [],
      complementary: [{ number: "576", name: "绀青", hex: "#4F84FF" }],
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
  },
  {
    number: "742",
    name: "深绿",
    pinyin: "Shen Lv",
    pinyinCompact: "shenlv",
    hex: "#0D5E3A",
    hsl: { h: 153, s: 76, l: 21 },
    hueCategory: "绿色系",
    temperature: "冷",
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
    main: { number: "742", name: "深绿", hex: "#0D5E3A" },
    secondary: [],
    accent: [],
    schemeText: "",
  },
];

const neutralColor: TraditionalColor = {
  ...colors[0],
  number: "331",
  name: "芦灰",
  pinyin: "Lu Hui",
  pinyinCompact: "luhui",
  hex: "#BDAEAD",
  hueCategory: "中性色",
  main: { number: "331", name: "芦灰", hex: "#BDAEAD" },
};

test("builds searchable keywords from color and palette metadata", () => {
  assert.deepEqual(getSearchKeywords(colors[0]).slice(0, 7), [
    "001",
    "乳白",
    "Ru Bai",
    "rubai",
    "#f9f4dc",
    "f9f4dc",
    "黄色系",
  ]);
  assert.ok(getSearchKeywords(colors[0]).includes("绀青"));
});

test("filters colors by query and hue category", () => {
  assert.deepEqual(
    filterColors(colors, "249", "all").map((color) => color.name),
    ["乳白"],
  );
  assert.deepEqual(
    filterColors(colors, "", "绿色系").map((color) => color.name),
    ["深绿"],
  );
  assert.deepEqual(
    filterColors(colors, "rubai", "all").map((color) => color.name),
    ["乳白"],
  );
});

test("returns stable hue categories", () => {
  assert.deepEqual(getHueCategories([...colors, neutralColor]), ["中性色", "绿色系", "黄色系"]);
});

test("sorts colors by the same hue order as the filter menu", () => {
  assert.deepEqual(
    sortColorsByHueCategory([...colors, neutralColor]).map((color) => color.hueCategory),
    ["中性色", "绿色系", "黄色系"],
  );
});

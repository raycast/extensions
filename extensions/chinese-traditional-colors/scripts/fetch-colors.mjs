import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pinyin } from "pinyin-pro";

const CSV_URL =
  "https://raw.githubusercontent.com/nevertoday/zhongguo-traditional-colors/main/docs/chinese-color-harmony.csv";

const paletteColumns = {
  similar: "同类色",
  analogous: "邻近色",
  complementary: "互补色",
  splitComplementary: "分裂互补",
  triadic: "三角色",
  tetradic: "四角色",
  temperatureContrast: "冷暖对照",
  light: "明色搭配",
  dark: "暗色搭配",
  muted: "灰调搭配",
  neutral: "中性色搭配",
  secondary: "辅色",
  accent: "点缀色",
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === "," && !quoted) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  return rows;
}

function parseReference(text) {
  const match = text.trim().match(/^(\d+)-(.+?)\s+(#[0-9A-Fa-f]{6})$/);
  if (!match) return null;
  return {
    number: match[1],
    name: match[2],
    hex: match[3].toUpperCase(),
  };
}

function parseReferenceList(text) {
  if (!text.trim()) return [];
  return text
    .split("|")
    .map((part) => parseReference(part))
    .filter(Boolean);
}

function rowToRecord(headers, row) {
  return Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""]));
}

function titleCaseWords(words) {
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function normalizeColor(record) {
  const colorPinyinWords = pinyin(record["色名"], { toneType: "none", type: "array" });
  const colorPinyin = titleCaseWords(colorPinyinWords);
  const palettes = Object.fromEntries(
    Object.entries(paletteColumns).map(([key, column]) => [key, parseReferenceList(record[column])]),
  );

  return {
    number: record["编号"],
    name: record["色名"],
    pinyin: colorPinyin,
    pinyinCompact: colorPinyinWords.join(""),
    hex: record["HEX"].toUpperCase(),
    hsl: {
      h: Number(record["H"]),
      s: Number(record["S"]),
      l: Number(record["L"]),
    },
    hueCategory: record["色相分类"],
    temperature: record["冷暖属性"],
    palettes,
    main: parseReference(record["主色"]) ?? {
      number: record["编号"],
      name: record["色名"],
      hex: record["HEX"].toUpperCase(),
    },
    secondary: parseReferenceList(record["辅色"]),
    accent: parseReferenceList(record["点缀色"]),
    schemeText: record["主辅点缀方案"],
  };
}

function renderData(colors) {
  return `import type { TraditionalColor } from "./types";

export const traditionalColors: TraditionalColor[] = ${JSON.stringify(colors, null, 2)};
`;
}

async function main() {
  const response = await fetch(CSV_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${CSV_URL}: ${response.status} ${response.statusText}`);
  }

  const rows = parseCsv(await response.text());
  const [headers, ...dataRows] = rows;
  const colors = dataRows.map((row) => normalizeColor(rowToRecord(headers, row)));

  if (colors.length !== 742) {
    throw new Error(`Expected 742 colors, received ${colors.length}`);
  }

  const outputPath = path.join(process.cwd(), "src", "color-data.ts");
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, renderData(colors), "utf8");
  console.log(`Generated ${colors.length} colors at ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

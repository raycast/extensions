import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { unicodeAliases, unicodeName, unicodeType } from "unicode-name";
import { unicodeGeneralCategoryLong } from "unicode-category";

const require = createRequire(import.meta.url);
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const extensionRoot = resolve(scriptDirectory, "..");
const repositoryRoot = resolve(extensionRoot, "..", "..");
const resourcesRoot = resolve(repositoryRoot, "GlyphEngine", "Resources", "CoreGlyphsData");
const outputPath = resolve(extensionRoot, "src", "data", "search-index.json");

const maximumCodePoint = 0x10ffff;
const skippedSymbolCategoryKeys = new Set(["all", "whatsnew", "draw", "variable", "multicolor"]);
const localizedScriptSuffixes = new Set(["ar", "he", "hi", "ja", "ko", "th", "zh"]);
const excludedUnicodeTypes = new Set(["Reserved", "Surrogate", "Private-use", "Noncharacter"]);
const excludedUnicodeNamePrefixes = [
  "CJK UNIFIED IDEOGRAPH",
  "CJK COMPATIBILITY IDEOGRAPH",
  "HANGUL SYLLABLE",
];
const includedUnicodeLetterRanges = [
  [0x0041, 0x007a], // Basic Latin letters
  [0x00c0, 0x00ff], // Latin-1 letters
  [0x0100, 0x017f], // Latin Extended-A
  [0x0370, 0x03ff], // Greek and Coptic
  [0x0400, 0x04ff], // Cyrillic
];
const unicodeCategoryRank = {
  symbols: 0,
  punctuation: 1,
  numbers: 2,
  letters: 3,
  marks: 4,
  separators: 5,
  formatOther: 6,
};
const symbolCategoryDisplayNames = {
  all: "All",
  communication: "Communication",
  weather: "Weather",
  maps: "Maps",
  objectsandtools: "Objects & Tools",
  devices: "Devices",
  cameraandphotos: "Camera & Photos",
  gaming: "Gaming",
  connectivity: "Connectivity",
  transportation: "Transportation",
  automotive: "Automotive",
  accessibility: "Accessibility",
  privacyandsecurity: "Privacy & Security",
  human: "Human",
  home: "Home",
  fitness: "Fitness",
  nature: "Nature",
  editing: "Editing",
  textformatting: "Text Formatting",
  media: "Media",
  keyboard: "Keyboard",
  commerce: "Commerce",
  time: "Time",
  health: "Health",
  shapes: "Shapes",
  arrows: "Arrows",
  indices: "Indices",
  math: "Math",
};
const unicodeCategoryGroups = {
  letters: "Letters",
  marks: "Marks",
  numbers: "Numbers",
  punctuation: "Punctuation",
  symbols: "Symbols",
  separators: "Separators",
  formatOther: "Format / Other",
};

function readPlistJSON(name) {
  const plistPath = resolve(resourcesRoot, `${name}.plist`);
  const output = execFileSync("/usr/bin/plutil", ["-convert", "json", "-o", "-", plistPath], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  return JSON.parse(output);
}

function readPackageJSON(packagePath) {
  return JSON.parse(readFileSync(require.resolve(packagePath), "utf8"));
}

function titleize(text) {
  return text
    .replaceAll("_", " ")
    .replaceAll(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll(/and/g, " & ")
    .replaceAll(/\b\w/g, (character) => character.toUpperCase());
}

function browseTier(name) {
  const parts = name.split(".");
  for (const component of parts.slice(-2)) {
    if (localizedScriptSuffixes.has(component)) {
      return 2;
    }
  }

  return /^\d+$/.test(parts[0] ?? "") ? 1 : 0;
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((lhs, rhs) => lhs.localeCompare(rhs));
}

function codePointLabel(codePoint) {
  return `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`;
}

function unicodeCategoryGroup(generalCategory) {
  switch (generalCategory) {
    case "Uppercase_Letter":
    case "Lowercase_Letter":
    case "Titlecase_Letter":
    case "Modifier_Letter":
    case "Other_Letter":
      return "letters";
    case "Nonspacing_Mark":
    case "Spacing_Mark":
    case "Enclosing_Mark":
      return "marks";
    case "Decimal_Number":
    case "Letter_Number":
    case "Other_Number":
      return "numbers";
    case "Connector_Punctuation":
    case "Dash_Punctuation":
    case "Open_Punctuation":
    case "Close_Punctuation":
    case "Initial_Punctuation":
    case "Final_Punctuation":
    case "Other_Punctuation":
      return "punctuation";
    case "Math_Symbol":
    case "Currency_Symbol":
    case "Modifier_Symbol":
    case "Other_Symbol":
      return "symbols";
    case "Space_Separator":
    case "Line_Separator":
    case "Paragraph_Separator":
      return "separators";
    case "Control":
    case "Format":
    case "Surrogate":
    case "Private_Use":
    case "Unassigned":
    default:
      return "formatOther";
  }
}

function unicodeAliasTerms(value) {
  const aliases = unicodeAliases(value);
  if (!aliases) {
    return [];
  }
  return uniqueSorted(Object.values(aliases).flat());
}

function isCodePointInRange(value, [lowerBound, upperBound]) {
  return lowerBound <= value && value <= upperBound;
}

function shouldIncludeUnicodeItem(value, category) {
  return category !== "letters" || includedUnicodeLetterRanges.some((range) => isCodePointInRange(value, range));
}

function buildSymbols() {
  const symbolSearch = readPlistJSON("symbol_search");
  const symbolCategories = readPlistJSON("symbol_categories");
  const categoriesPlist = readPlistJSON("categories");
  const categories = categoriesPlist
    .filter((entry) => entry?.key && entry?.icon && !skippedSymbolCategoryKeys.has(entry.key))
    .map((entry) => ({
      key: entry.key,
      displayName: symbolCategoryDisplayNames[entry.key] ?? titleize(entry.key),
      icon: entry.icon,
    }));
  const categoryByKey = new Map(categories.map((category) => [category.key, category]));

  const items = Object.keys(symbolSearch)
    .map((name) => {
      const aliases = uniqueSorted(symbolSearch[name] ?? []);
      const categoryKeys = uniqueSorted(
        (symbolCategories[name] ?? []).filter((key) => categoryByKey.has(key) && !skippedSymbolCategoryKeys.has(key)),
      );
      const categoryNames = categoryKeys.map((key) => categoryByKey.get(key).displayName);
      return {
        kind: "symbol",
        name,
        icon: `sf-symbols/${name}.png`,
        aliases,
        categoryKeys,
        categoryNames,
        primaryCategory: categoryNames[0] ?? "SF Symbol",
        tier: browseTier(name),
      };
    })
    .sort((lhs, rhs) => {
      if (lhs.tier !== rhs.tier) {
        return lhs.tier - rhs.tier;
      }
      return lhs.name.localeCompare(rhs.name);
    });

  return { categories, items };
}

function buildEmoji() {
  const emojiByCharacter = readPackageJSON("unicode-emoji-json/data-by-emoji.json");
  const orderedEmoji = readPackageJSON("unicode-emoji-json/data-ordered-emoji.json");
  const groups = [];
  const seenGroups = new Set();

  const items = orderedEmoji.flatMap((character) => {
    const entry = emojiByCharacter[character];
    if (!entry) {
      return [];
    }
    if (!seenGroups.has(entry.group)) {
      seenGroups.add(entry.group);
      groups.push(entry.group);
    }
    return {
      kind: "emoji",
      character,
      name: entry.name,
      group: entry.group,
      slug: entry.slug,
      skinToneSupport: entry.skin_tone_support,
    };
  });

  return { groups, items };
}

function buildUnicode(excludedCharacters) {
  const items = [];
  for (let value = 0; value <= maximumCodePoint; value += 1) {
    const type = unicodeType(value);
    if (excludedUnicodeTypes.has(type)) {
      continue;
    }

    const name = unicodeName(value);
    if (!name || name.startsWith("<") || excludedUnicodeNamePrefixes.some((prefix) => name.startsWith(prefix))) {
      continue;
    }

    const character = String.fromCodePoint(value);
    if (excludedCharacters.has(character)) {
      continue;
    }

    const generalCategory = unicodeGeneralCategoryLong(character);
    const category = unicodeCategoryGroup(generalCategory);
    if (!shouldIncludeUnicodeItem(value, category)) {
      continue;
    }
    items.push({
      kind: "unicode",
      character,
      name,
      codePoint: value.toString(16).toUpperCase(),
      codePointLabel: codePointLabel(value),
      category,
      categoryName: unicodeCategoryGroups[category],
      generalCategory: titleize(generalCategory),
      aliases: unicodeAliasTerms(value),
    });
  }

  items.sort((lhs, rhs) => {
    const lhsRank = unicodeCategoryRank[lhs.category] ?? 99;
    const rhsRank = unicodeCategoryRank[rhs.category] ?? 99;
    if (lhsRank !== rhsRank) {
      return lhsRank - rhsRank;
    }
    return Number.parseInt(lhs.codePoint, 16) - Number.parseInt(rhs.codePoint, 16);
  });

  return { groups: unicodeCategoryGroups, items };
}

const symbols = buildSymbols();
const emoji = buildEmoji();
const unicode = buildUnicode(new Set(emoji.items.map((item) => item.character)));

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(
  outputPath,
  `${JSON.stringify(
    {
      source: {
        symbols: "GlyphEngine/Resources/CoreGlyphsData",
        emoji: "unicode-emoji-json",
        unicode: "unicode-name/unicode-category",
      },
      counts: {
        symbol: symbols.items.length,
        emoji: emoji.items.length,
        unicode: unicode.items.length,
      },
      categories: {
        symbols: symbols.categories,
        emoji: emoji.groups,
        unicode: unicode.groups,
      },
      symbols: symbols.items,
      emoji: emoji.items,
      unicode: unicode.items,
    },
    null,
    2,
  )}\n`,
);

console.log(
  `Wrote ${symbols.items.length} SF Symbols, ${emoji.items.length} emoji, and ${unicode.items.length} Unicode scalars to ${outputPath}`,
);

#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_CURSOR_ICONS_PATH = path.resolve(__dirname, "../../../cursor-icons/source/icons/new");
const DEFAULT_FIGMA_TAGS_PATH = path.resolve(__dirname, "../../../figma-plugin-icons/src/tags.json");
const EXTENSION_ROOT = path.resolve(__dirname, "..");
const DEFAULT_DATA_DIR = path.join(EXTENSION_ROOT, "data");
const DEFAULT_ASSETS_DIR = path.join(EXTENSION_ROOT, "assets");
const DEFAULT_OUTPUT_DIR = path.join(DEFAULT_ASSETS_DIR, "icons");
const DEFAULT_SIZE = "16";

function toDisplayName(name) {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normaliseSvg(svg) {
  return svg
    .replace(/fill="#[0-9A-Fa-f]{6}"/g, 'fill="currentColor"')
    .replace(/\s*opacity="[^"]*"/g, "");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function readSvg(filePath) {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }

  const svg = fs.readFileSync(filePath, "utf8").trim();
  return svg.includes('opacity="0.1"') ? undefined : normaliseSvg(svg);
}

function resolveIconSvg(name, sourceRoot, size) {
  const isFilled = name.endsWith("-filled");
  const baseName = isFilled ? name.slice(0, -"-filled".length) : name;
  const filledPath = path.join(sourceRoot, "icons", size, "filled", `${baseName}.svg`);
  const outlinePath = path.join(sourceRoot, "icons", size, "outline", `${name}.svg`);
  const fallbackFilledPath = path.join(sourceRoot, "icons", size, "filled", `${name}.svg`);

  if (isFilled) {
    return { svg: readSvg(filledPath), sourcePath: filledPath, style: "filled" };
  }

  const outlineSvg = readSvg(outlinePath);
  if (outlineSvg) {
    return { svg: outlineSvg, sourcePath: outlinePath, style: "outline" };
  }

  return { svg: readSvg(fallbackFilledPath), sourcePath: fallbackFilledPath, style: "outline" };
}

function loadTags(dataDir, fallbackTagsPath = DEFAULT_FIGMA_TAGS_PATH) {
  const localTagsPath = path.join(dataDir, "tags.json");

  if (fs.existsSync(localTagsPath)) {
    return readJson(localTagsPath);
  }

  if (!fs.existsSync(fallbackTagsPath)) {
    return {};
  }

  const tags = readJson(fallbackTagsPath);
  writeJson(localTagsPath, tags);
  return tags;
}

function loadConcepts(dataDir) {
  const conceptsPath = path.join(dataDir, "concepts.json");
  return fs.existsSync(conceptsPath) ? readJson(conceptsPath) : [];
}

function buildIconData(options = {}) {
  const sourceRoot = path.resolve(options.sourceRoot || process.env.CURSOR_ICONS_PATH || DEFAULT_CURSOR_ICONS_PATH);
  const dataDir = path.resolve(options.dataDir || DEFAULT_DATA_DIR);
  const outputDir = path.resolve(options.outputDir || DEFAULT_OUTPUT_DIR);
  const size = options.size || DEFAULT_SIZE;
  const mappingPath = path.join(sourceRoot, "mapping.json");

  if (!fs.existsSync(mappingPath)) {
    throw new Error(`Cursor icon mapping not found: ${mappingPath}`);
  }

  const mapping = readJson(mappingPath);
  const tags = loadTags(dataDir, options.fallbackTagsPath);
  const conceptRows = loadConcepts(dataDir);
  const iconOutputRoot = path.join(outputDir, size);
  const icons = [];
  const skipped = [];

  fs.rmSync(iconOutputRoot, { recursive: true, force: true });

  for (const [name, codepoint] of Object.entries(mapping).sort(([left], [right]) => left.localeCompare(right))) {
    if (name === "_temp") {
      continue;
    }

    const { svg, sourcePath, style } = resolveIconSvg(name, sourceRoot, size);
    if (!svg) {
      skipped.push(name);
      continue;
    }

    const asset = `icons/${size}/${style}/${name}.svg`;
    const outputPath = path.join(outputDir, size, style, `${name}.svg`);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${svg}\n`);

    icons.push({
      name,
      displayName: toDisplayName(name),
      tags: tags[name] || [],
      unicode: String.fromCodePoint(codepoint),
      codepoint,
      style,
      asset,
      source: path.relative(sourceRoot, sourcePath),
    });
  }

  const iconsByName = new Map(icons.map((icon) => [icon.name, icon]));
  const concepts = [];
  const skippedConcepts = [];

  for (const concept of conceptRows) {
    const icon = iconsByName.get(concept.iconName);
    if (!icon) {
      skippedConcepts.push(concept);
      continue;
    }

    concepts.push({
      concept: concept.concept,
      iconName: concept.iconName,
      unicode: icon.unicode,
      asset: icon.asset,
      tags: concept.tags || [],
    });
  }

  const data = {
    icons,
    concepts,
    meta: {
      sourceRoot,
      size,
      iconCount: icons.length,
      conceptCount: concepts.length,
      skippedCount: skipped.length,
      skippedConceptCount: skippedConcepts.length,
    },
  };

  writeJson(path.join(outputDir, "data.json"), data);

  return { data, skipped, skippedConcepts };
}

function main() {
  try {
    const { data, skipped, skippedConcepts } = buildIconData();
    console.log(`Generated ${data.meta.iconCount} Cursor icons and ${data.meta.conceptCount} concepts`);

    if (skipped.length > 0) {
      console.log(`Skipped ${skipped.length} icons without SVG assets`);
    }

    if (skippedConcepts.length > 0) {
      console.log(`Skipped ${skippedConcepts.length} concepts with missing icons`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  buildIconData,
  normaliseSvg,
  resolveIconSvg,
  toDisplayName,
};

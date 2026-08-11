import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const configPath = path.join(repoRoot, "src/config/image-preferences.json");
const packageJsonPath = path.join(repoRoot, "package.json");

const mode = process.argv.includes("--check") ? "check" : "write";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function toOptionTitle(domain, value, defaultValue) {
  if (domain === "imageOutputFormat") {
    const imageOutputTitles = {
      ".jpg": ".JPG",
      ".png": ".PNG",
      ".webp": ".WEBP",
      ".heic": ".HEIC (macOS only)",
      ".tiff": ".TIFF",
      ".avif": ".AVIF",
    };
    return imageOutputTitles[value] ?? value;
  }

  if (domain === "webpQuality" && value === "lossless") {
    return "Lossless (when supported)";
  }

  if (domain === "pngVariant") {
    return value === "png-24" ? "PNG-24" : "PNG-8";
  }

  if (domain === "tiffCompression") {
    return value === "deflate" ? "Deflate" : "LZW";
  }

  if (value === defaultValue) {
    return `${value} (Default)`;
  }

  return value;
}

function buildPreferenceData(domain, domainValues, defaultValue) {
  if (!Array.isArray(domainValues)) {
    throw new Error(`Domain "${domain}" must be an array of values`);
  }

  if (!domainValues.includes(defaultValue)) {
    throw new Error(`Default value "${defaultValue}" is not in domain "${domain}"`);
  }

  return domainValues.map((value) => ({
    title: toOptionTitle(domain, value, defaultValue),
    value,
  }));
}

function buildImagePreferences(config) {
  const domains = config.valueDomains ?? {};
  const preferences = config.preferences ?? [];

  return preferences.map((pref) => ({
    name: pref.name,
    type: "dropdown",
    title: pref.title,
    default: pref.default,
    required: false,
    data: buildPreferenceData(pref.domain, domains[pref.domain], pref.default),
    description: pref.description,
  }));
}

function mergePreferences(packageJson, imagePreferences) {
  const legacyImagePreferenceNames = new Set(["defaultImageQualityPreset"]);
  const generatedImagePreferenceNames = new Set(imagePreferences.map((pref) => pref.name));
  const imagePreferenceNames = new Set([...generatedImagePreferenceNames, ...legacyImagePreferenceNames]);

  const currentPreferences = packageJson.preferences ?? [];

  let anchorIndex = currentPreferences.findIndex((pref) => imagePreferenceNames.has(pref.name));
  if (anchorIndex === -1) {
    const videoAnchor = currentPreferences.findIndex((pref) => pref.name === "defaultVideoOutputFormat");
    anchorIndex = videoAnchor === -1 ? currentPreferences.length : videoAnchor;
  }

  const before = currentPreferences.slice(0, anchorIndex).filter((pref) => !imagePreferenceNames.has(pref.name));
  const after = currentPreferences.slice(anchorIndex).filter((pref) => !imagePreferenceNames.has(pref.name));

  return [...before, ...imagePreferences, ...after];
}

const config = readJson(configPath);
const packageJson = readJson(packageJsonPath);

const generatedImagePreferences = buildImagePreferences(config);
const nextPreferences = mergePreferences(packageJson, generatedImagePreferences);
const nextPackageJson = {
  ...packageJson,
  preferences: nextPreferences,
};

const nextPackageJsonString = `${JSON.stringify(nextPackageJson, null, 2)}\n`;
const currentPackageJsonString = fs.readFileSync(packageJsonPath, "utf8");
const hasDiff = currentPackageJsonString !== nextPackageJsonString;

if (mode === "check") {
  if (hasDiff) {
    console.error("Image preferences are out of sync. Run: npm run generate:image-preferences");
    process.exit(1);
  }
  console.log("Image preferences are in sync.");
  process.exit(0);
}

if (hasDiff) {
  fs.writeFileSync(packageJsonPath, nextPackageJsonString);
  console.log("Updated package.json image preferences from src/config/image-preferences.json");
} else {
  console.log("package.json image preferences are already up to date.");
}

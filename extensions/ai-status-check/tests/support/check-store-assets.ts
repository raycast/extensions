import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

interface ExtensionManifest {
  name?: string;
  title?: string;
  description?: string;
  author?: string;
  icon?: string;
  license?: string;
  platforms?: unknown[];
  commands?: unknown[];
  scripts?: Record<string, unknown>;
}

const root = process.cwd();
const allowMissingScreenshots = process.argv.includes("--allow-missing-screenshots");
const errors: string[] = [];

async function exists(relativePath: string): Promise<boolean> {
  try {
    await access(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function requireFile(relativePath: string) {
  if (!(await exists(relativePath))) errors.push(`Missing required file: ${relativePath}`);
}

async function pngSize(relativePath: string): Promise<{ width: number; height: number } | undefined> {
  const contents = await readFile(path.join(root, relativePath));
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (contents.length < 24 || !contents.subarray(0, 8).equals(signature)) {
    errors.push(`${relativePath} is not a valid PNG file`);
    return undefined;
  }

  return { width: contents.readUInt32BE(16), height: contents.readUInt32BE(20) };
}

async function findFiles(relativeDirectory: string): Promise<string[]> {
  if (!(await exists(relativeDirectory))) return [];

  const entries = await readdir(path.join(root, relativeDirectory), { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const relativePath = path.join(relativeDirectory, entry.name);
      return entry.isDirectory() ? findFiles(relativePath) : [relativePath];
    }),
  );
  return files.flat();
}

async function main() {
  for (const requiredFile of ["README.md", "CHANGELOG.md", "LICENSE", "THIRD_PARTY_NOTICES.md", "package-lock.json"]) {
    await requireFile(requiredFile);
  }

  for (const forbiddenPath of [".firecrawl", ".test-dist", "dist", "docs", "scripts"]) {
    if (await exists(forbiddenPath)) errors.push(`Development-only path must not be packaged: ${forbiddenPath}`);
  }

  const packageContents = await readFile(path.join(root, "package.json"), "utf8");
  const manifest = JSON.parse(packageContents) as ExtensionManifest;
  if (!manifest.name || !manifest.title || !manifest.description)
    errors.push("Manifest identity fields are incomplete");
  if (manifest.author !== "Astatine-213") errors.push("Manifest author must match the Raycast username Astatine-213");
  if (manifest.license !== "MIT") errors.push("Manifest license must be MIT");
  if (!Array.isArray(manifest.platforms) || manifest.platforms.length === 0)
    errors.push("Manifest platforms are missing");
  if (!Array.isArray(manifest.commands) || manifest.commands.length === 0) errors.push("Manifest commands are missing");

  const unpublishedScriptPaths = Object.values(manifest.scripts ?? {}).filter(
    (script): script is string => typeof script === "string" && script.includes(".github/"),
  );
  if (unpublishedScriptPaths.length > 0) {
    errors.push("Package scripts must not reference .github because Raycast excludes it from Store submissions");
  }

  const iconPath = manifest.icon ? path.join("assets", manifest.icon) : undefined;
  if (!iconPath || !(await exists(iconPath))) {
    errors.push("Manifest icon is missing");
  } else {
    const size = await pngSize(iconPath);
    if (size && (size.width !== 512 || size.height !== 512)) {
      errors.push(`${iconPath} must be exactly 512x512 pixels`);
    }
  }

  const sourceAssets = (await findFiles("assets")).filter((file) => file.endsWith("-source.svg"));
  if (sourceAssets.length > 0) errors.push(`Unused source assets remain: ${sourceAssets.join(", ")}`);

  const metadataFiles = await findFiles("metadata");
  const screenshots = metadataFiles.filter((file) => file.toLowerCase().endsWith(".png"));
  const unsupportedMetadata = metadataFiles.filter((file) => !file.toLowerCase().endsWith(".png"));
  if (unsupportedMetadata.length > 0) {
    errors.push(`Store screenshot metadata must be PNG only: ${unsupportedMetadata.join(", ")}`);
  }
  if (screenshots.length === 0 && allowMissingScreenshots) {
    console.warn("Store screenshots are not present yet; strict publish validation will require 3 to 6 PNG files.");
  } else {
    if (screenshots.length < 3 || screenshots.length > 6) {
      errors.push(`Store metadata must contain 3 to 6 PNG screenshots; found ${screenshots.length}`);
    }
    for (const screenshot of screenshots) {
      const size = await pngSize(screenshot);
      if (size && (size.width !== 2000 || size.height !== 1250)) {
        errors.push(`${screenshot} must be exactly 2000x1250 pixels`);
      }
    }
  }

  if (errors.length > 0) {
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log("Raycast Store metadata and package assets passed validation.");
}

void main();

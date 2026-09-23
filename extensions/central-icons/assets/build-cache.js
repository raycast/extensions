// Runs as a standalone Node child process (spawned by src/pack.ts) so the
// 52MB icons/index.js never enters Raycast's memory-limited worker.
const { mkdirSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const { gzipSync } = require("node:zlib");

const [packDir, cacheDir] = process.argv.slice(2);
const { centralIcons, centralIconsMetadata } = require(
  join(packDir, "icons/index.js"),
);

const byVariant = new Map();
for (const [key, svg] of Object.entries(centralIcons)) {
  const slash = key.indexOf("/");
  const variant = key.slice(0, slash);
  const name = key.slice(slash + 1);
  let icons = byVariant.get(variant);
  if (!icons) byVariant.set(variant, (icons = {}));
  icons[name] = svg;
}

mkdirSync(cacheDir, { recursive: true });
for (const [variant, icons] of byVariant) {
  writeFileSync(
    join(cacheDir, `${variant}.json.gz`),
    gzipSync(JSON.stringify(icons), { level: 9 }),
  );
}

const iconNames = Object.keys(centralIconsMetadata).sort();
const categories = [
  ...new Set(iconNames.map((n) => centralIconsMetadata[n].category)),
].sort();
writeFileSync(
  join(cacheDir, "metadata.json"),
  JSON.stringify({ iconNames, categories, metadata: centralIconsMetadata }),
);

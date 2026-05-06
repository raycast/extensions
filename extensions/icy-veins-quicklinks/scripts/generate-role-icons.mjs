/**
 * Composites the role badge (dps/tank/healer) into the bottom-right corner of
 * each spec icon and writes the result to assets/icons/with-role/.
 *
 * Run once (or after adding new specs/role icons):
 *   node scripts/generate-role-icons.mjs
 */

import sharp from "sharp";
import { readFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const iconsDir = join(root, "assets", "icons");
const outDir = join(root, "assets", "icons", "with-role");

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const specsSrc = readFileSync(join(root, "src", "data", "specs.ts"), "utf8");
const slugs = [...specsSrc.matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]);
const roles = [...specsSrc.matchAll(/pveRole:\s*"([^"]+)"/g)].map((m) => m[1]);

const specRoles = new Map();
slugs.forEach((slug, i) => specRoles.set(slug, roles[i]));

const ICON_SIZE = 600;
const BADGE_SIZE = Math.round(ICON_SIZE * 0.25);
const MARGIN = 25;

async function composite(specSlug, pveRole) {
  const specPath = join(iconsDir, `${specSlug}.jpg`);
  const badgePath = join(iconsDir, `${pveRole}.png`);
  const outPath = join(outDir, `${specSlug}.jpg`);

  if (!existsSync(specPath)) { console.warn(`  SKIP ${specSlug}.jpg — source not found`); return; }
  if (!existsSync(badgePath)) { console.warn(`  SKIP ${specSlug} — badge ${pveRole}.png not found`); return; }

  const badge = await sharp(badgePath).resize(BADGE_SIZE, BADGE_SIZE).toBuffer();
  const top = ICON_SIZE - BADGE_SIZE - MARGIN;
  const left = ICON_SIZE - BADGE_SIZE - MARGIN;

  await sharp(specPath)
    .resize(ICON_SIZE, ICON_SIZE)
    .composite([{ input: badge, top, left }])
    .jpeg({ quality: 90 })
    .toFile(outPath);

  console.log(`  ✓ ${specSlug} (${pveRole})`);
}

console.log(`Generating ${specRoles.size} composited role icons -> assets/icons/with-role/\n`);
await Promise.all([...specRoles.entries()].map(([slug, role]) => composite(slug, role)));
console.log("\nDone.");

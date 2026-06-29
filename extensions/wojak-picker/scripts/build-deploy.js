#!/usr/bin/env node

/**
 * Build the static deploy bundle for self-hosting the Wojak library on a VPS.
 *
 * It does two things:
 *   1. Generates 320px thumbnails from assets/wojaks/** into deploy/dist/thumbs/**
 *      (mirrors the on-the-fly thumbnails Supabase used to render).
 *   2. Copies full images into deploy/dist/images/** and writes deploy/dist/wojaks.json,
 *      a static metadata manifest with thumbUrl/fullUrl rewritten to point at your VPS.
 *
 * After running this, scripts/deploy-vps.sh rsyncs deploy/dist/** to the server.
 *
 * Usage:
 *   WOJAK_BASE_URL=https://wojaks.example.com node scripts/build-deploy.js
 *
 * Env:
 *   WOJAK_BASE_URL   (required) Public base URL the extension will hit, no trailing slash.
 *   THUMB_SIZE       (optional) Max thumbnail edge in px. Default 320.
 *   THUMB_QUALITY    (optional) Thumbnail quality 1-100. Default 70.
 *   THUMB_COLORS     (optional) Palette size for PNG thumbnails (2-256). Default 128.
 *                    Lower = smaller files. Wojak art is flat-color, so 128 is ~lossless
 *                    visually while roughly halving thumbnail size vs full-color PNG.
 *   CONCURRENCY      (optional) Parallel image workers. Default 8.
 *   COPY_FULL        (optional) "0" to skip copying full images (e.g. if you push
 *                    assets/wojaks as the images/ folder separately). Default "1".
 *   RESUME           (optional) "1" to skip images/thumbnails that already exist, so an
 *                    interrupted build can continue where it left off. Default off.
 */

const fs = require("fs");
const path = require("path");

let sharp;
try {
  sharp = require("sharp");
} catch {
  console.error('Missing dependency "sharp". Install it first:  npm install sharp');
  process.exitCode = 1;
  return;
}

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, "assets/wojaks.json");
const DIST_DIR = path.join(ROOT, "deploy/dist");
const IMAGES_DIR = path.join(DIST_DIR, "images");
const THUMBS_DIR = path.join(DIST_DIR, "thumbs");

const BASE_URL = (process.env.WOJAK_BASE_URL || "").trim().replace(/\/$/, "");
const THUMB_SIZE = Number(process.env.THUMB_SIZE || 320);
const THUMB_QUALITY = Number(process.env.THUMB_QUALITY || 70);
const THUMB_COLORS = Number(process.env.THUMB_COLORS || 128);
const CONCURRENCY = Number(process.env.CONCURRENCY || 8);
const COPY_FULL = process.env.COPY_FULL !== "0";
// RESUME=1 skips images/thumbnails that already exist, so interrupted builds can continue.
const RESUME = process.env.RESUME === "1";

function encodePath(objectPath) {
  return objectPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

async function runWithConcurrency(items, limit, worker) {
  let nextIndex = 0;
  async function consume() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      await worker(items[currentIndex], currentIndex);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => consume()));
}

async function main() {
  if (!BASE_URL) {
    throw new Error("Set WOJAK_BASE_URL, e.g. WOJAK_BASE_URL=https://wojaks.example.com node scripts/build-deploy.js");
  }
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`Missing local manifest at ${MANIFEST_PATH}`);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  console.log(`Building deploy bundle for ${manifest.length} wojaks -> ${BASE_URL}`);
  console.log(`Thumbnails: ${THUMB_SIZE}px @ q${THUMB_QUALITY}, ${THUMB_COLORS}-color PNG palette  |  copy full images: ${COPY_FULL}`);

  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  fs.mkdirSync(THUMBS_DIR, { recursive: true });

  // jsDelivr/GitHub are case-sensitive but macOS isn't, so existsSync() can't tell
  // "Foo.png" from "foo.png". Build a set of the REAL on-disk casing (from readdir)
  // and keep only entries whose path matches exactly — otherwise duplicate case
  // variants would produce 404s on the CDN.
  const realPaths = new Set();
  (function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else realPaths.add(path.relative(ROOT, full));
    }
  })(path.join(ROOT, "assets/wojaks"));

  const rows = new Array(manifest.length);
  const missing = [];
  let skippedCase = 0;
  let done = 0;

  await runWithConcurrency(manifest, CONCURRENCY, async (item, index) => {
    const localPath = path.join(ROOT, item.localPath);
    if (!fs.existsSync(localPath)) {
      missing.push(item.filename);
      return;
    }
    // Drop case-variant duplicates that don't match the actual filename on disk.
    if (!realPaths.has(path.normalize(item.localPath))) {
      skippedCase += 1;
      return;
    }

    const objectPath = `${item.slug}/${item.filename}`;

    // Full image -> deploy/dist/images/<slug>/<filename>
    if (COPY_FULL) {
      const fullDest = path.join(IMAGES_DIR, item.slug, item.filename);
      if (!(RESUME && fs.existsSync(fullDest))) {
        fs.mkdirSync(path.dirname(fullDest), { recursive: true });
        fs.copyFileSync(localPath, fullDest);
      }
    }

    // Thumbnail -> deploy/dist/thumbs/<slug>/<filename> (same extension/format)
    const thumbDest = path.join(THUMBS_DIR, item.slug, item.filename);
    if (!(RESUME && fs.existsSync(thumbDest) && fs.statSync(thumbDest).size > 0)) {
      fs.mkdirSync(path.dirname(thumbDest), { recursive: true });
      try {
        let pipeline = sharp(localPath, { animated: false }).resize(THUMB_SIZE, THUMB_SIZE, {
          fit: "inside",
          withoutEnlargement: true,
        });
        const ext = (item.extension || path.extname(item.filename).slice(1)).toLowerCase();
        if (ext === "png")
          pipeline = pipeline.png({
            quality: THUMB_QUALITY,
            palette: true,
            colours: THUMB_COLORS,
            effort: 10,
            compressionLevel: 9,
          });
        else if (ext === "webp") pipeline = pipeline.webp({ quality: THUMB_QUALITY });
        else pipeline = pipeline.jpeg({ quality: THUMB_QUALITY });
        await pipeline.toFile(thumbDest);
      } catch (error) {
        // If thumbnailing fails, fall back to the full image so the grid still works.
        fs.copyFileSync(localPath, thumbDest);
        console.warn(`thumb fallback for ${objectPath}: ${error instanceof Error ? error.message : error}`);
      }
    }

    rows[index] = {
      id: item.id,
      name: item.name,
      category: item.category,
      filename: item.filename,
      slug: item.slug,
      thumbUrl: `${BASE_URL}/thumbs/${encodePath(objectPath)}`,
      fullUrl: `${BASE_URL}/images/${encodePath(objectPath)}`,
      sourcePageUrl: item.sourcePageUrl || "",
    };

    done += 1;
    if (done % 250 === 0) console.log(`  processed ${done}/${manifest.length}`);
  });

  const populated = rows.filter(Boolean);
  fs.writeFileSync(path.join(DIST_DIR, "wojaks.json"), JSON.stringify(populated));

  console.log(`\nWrote ${populated.length} entries to deploy/dist/wojaks.json`);
  if (skippedCase) {
    console.log(`Dropped ${skippedCase} case-variant duplicate entries (kept the on-disk casing).`);
  }
  if (missing.length) {
    console.log(`Skipped ${missing.length} missing local files: ${missing.slice(0, 10).join(", ")}${missing.length > 10 ? " ..." : ""}`);
  }
  console.log("Bundle ready in deploy/dist/  ->  run scripts/deploy-vps.sh to upload.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

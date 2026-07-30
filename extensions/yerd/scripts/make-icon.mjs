#!/usr/bin/env node
/**
 * Generates assets/extension-icon.png (512x512).
 *
 * Strategy, in order:
 *   1. "fetch+render": download https://yerd.app/logo.svg and render it via sharp,
 *      centered on a padded 512x512 dark-friendly background.
 *   2. "fallback-placeholder (sharp svg)": render a simple branded SVG via sharp.
 *   3. "fallback-placeholder (embedded png)": write a hardcoded base64 512x512 PNG.
 *
 * This script must NEVER fail: it always produces a file and exits 0.
 */
import { Buffer } from "node:buffer";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(projectRoot, "assets", "extension-icon.png");

const LOGO_URL = "https://yerd.app/logo.svg";

const FALLBACK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" rx="128" fill="#4F46E5"/><text x="256" y="320" font-family="system-ui" font-size="300" font-weight="bold" fill="white" text-anchor="middle">Y</text></svg>';

// Hardcoded 512x512 solid #4F46E5 PNG used when sharp itself is unavailable.
const PLACEHOLDER_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAgAAAAIACAIAAAB7GkOtAAAFoElEQVR42u3VMQ0AAAgEsVfHin8B+MADK02q4JZL1wDwUCQAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAMAAVAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAAAxABQADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADADAACQAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAMQAUAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAAA1ABwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAOBmAaP1WJmycDGbAAAAAElFTkSuQmCC";

function message(error) {
  return error instanceof Error ? error.message : String(error);
}

async function loadSharp() {
  try {
    return (await import("sharp")).default;
  } catch (error) {
    console.warn(`[make-icon] sharp unavailable: ${message(error)}`);
    return null;
  }
}

async function fetchLogo() {
  const response = await fetch(LOGO_URL, {
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${LOGO_URL}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function renderPadded(sharp, logoSvg) {
  const logo = await sharp(logoSvg)
    .resize(384, 384, { fit: "inside" })
    .png()
    .toBuffer();
  return sharp({
    create: { width: 512, height: 512, channels: 4, background: "#1C1B2A" },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toBuffer();
}

async function generate() {
  const sharp = await loadSharp();
  if (sharp) {
    try {
      const png = await renderPadded(sharp, await fetchLogo());
      return { png, route: "fetch+render" };
    } catch (error) {
      console.warn(`[make-icon] fetch+render failed: ${message(error)}`);
    }
    try {
      const png = await sharp(Buffer.from(FALLBACK_SVG)).png().toBuffer();
      return { png, route: "fallback-placeholder (sharp svg)" };
    } catch (error) {
      console.warn(`[make-icon] sharp svg fallback failed: ${message(error)}`);
    }
  }
  return {
    png: Buffer.from(PLACEHOLDER_PNG_BASE64, "base64"),
    route: "fallback-placeholder (embedded png)",
  };
}

try {
  mkdirSync(dirname(outPath), { recursive: true });
  const { png, route } = await generate();
  writeFileSync(outPath, png);
  console.log(`[make-icon] ${route} -> ${outPath} (${png.length} bytes)`);
} catch (error) {
  // Last resort: never fail the pipeline over an icon.
  try {
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, Buffer.from(PLACEHOLDER_PNG_BASE64, "base64"));
    console.log(
      `[make-icon] fallback-placeholder (embedded png, after error: ${message(error)}) -> ${outPath}`,
    );
  } catch (writeError) {
    console.error(`[make-icon] could not write icon: ${message(writeError)}`);
  }
}

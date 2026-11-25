import { execFile } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { PremiereFile } from "../types";

const execFileAsync = promisify(execFile);

const inFlightGenerations = new Map<string, Promise<string | null>>();

export function getThumbnailCacheDirectory(): string {
  let supportPath: string | undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const raycastApi = require("@raycast/api");
    supportPath = raycastApi.environment?.supportPath;
  } catch {
    // Standalone or test environment
  }

  const baseDir = supportPath || path.join(os.homedir(), ".raycast/premiere-projects");
  const cacheDir = path.join(baseDir, "thumbnails");
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  return cacheDir;
}

function getCacheKey(filePath: string, mtimeMs: number): string {
  return crypto.createHash("md5").update(`${filePath}:${mtimeMs}`).digest("hex");
}

export function getCachedThumbnailPath(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const stats = fs.statSync(filePath);
    const cacheKey = getCacheKey(filePath, stats.mtimeMs);
    const cachedPath = path.join(getThumbnailCacheDirectory(), `${cacheKey}.png`);
    return fs.existsSync(cachedPath) ? cachedPath : null;
  } catch {
    return null;
  }
}

/**
 * Generates an SVG data-URI card for cross-platform visual preview.
 */
export function generateProjectSvgThumbnail(file: PremiereFile): string {
  const title = escapeXml(truncate(file.title, 26));
  const size = escapeXml(file.formattedSize);
  const ext = escapeXml(file.extension.toUpperCase());
  const dim = file.dimensions ? `${file.dimensions.width}×${file.dimensions.height}` : "";
  const seq = file.sequences && file.sequences.length > 0 ? escapeXml(truncate(file.sequences[0], 30)) : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 320" width="512" height="320">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#141124" />
      <stop offset="100%" stop-color="#090714" />
    </linearGradient>
    <linearGradient id="badge" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#9999FF" />
      <stop offset="100%" stop-color="#562889" />
    </linearGradient>
    <linearGradient id="filmstrip" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#3b2d60" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#241940" stop-opacity="0.1" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="512" height="320" rx="20" fill="url(#bg)" />
  <rect x="1" y="1" width="510" height="318" rx="19" fill="none" stroke="#2e274a" stroke-width="2" />

  <!-- Subtle Filmstrip Header Accent -->
  <rect x="0" y="0" width="512" height="24" rx="20" fill="url(#filmstrip)" />
  <circle cx="28" cy="12" r="4" fill="#584879" opacity="0.6" />
  <circle cx="48" cy="12" r="4" fill="#584879" opacity="0.6" />
  <circle cx="68" cy="12" r="4" fill="#584879" opacity="0.6" />
  <circle cx="444" cy="12" r="4" fill="#584879" opacity="0.6" />
  <circle cx="464" cy="12" r="4" fill="#584879" opacity="0.6" />
  <circle cx="484" cy="12" r="4" fill="#584879" opacity="0.6" />

  <!-- Premiere Pro Brand Icon Badge -->
  <rect x="36" y="56" width="68" height="68" rx="14" fill="#00005B" />
  <rect x="37" y="57" width="66" height="66" rx="13" fill="none" stroke="#9999FF" stroke-width="1.5" />
  <text x="70" y="103" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="34" font-weight="800" fill="#9999FF" text-anchor="middle">Pr</text>

  <!-- Extension Pill Tag -->
  <rect x="120" y="60" width="76" height="26" rx="6" fill="#2d1c47" stroke="#7145a3" stroke-width="1" />
  <text x="158" y="78" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" fill="#d8b4fe" text-anchor="middle">${ext}</text>

  <!-- Project Title -->
  <text x="36" y="172" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="700" fill="#f8fafc">
    ${title}
  </text>

  <!-- Sequence / Resolution Details -->
  ${
    seq
      ? `<text x="36" y="212" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="500" fill="#a78bfa">🎬 Sequence: ${seq}</text>`
      : `<text x="36" y="212" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="500" fill="#94a3b8">Adobe Premiere Pro Project</text>`
  }

  <!-- Footer metadata: Size and Dimensions -->
  <text x="36" y="278" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600" fill="#cbd5e1">
    ${size}${dim ? `  •  ${dim}` : ""}
  </text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + "…";
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function getOrGenerateThumbnail(file: PremiereFile): Promise<string> {
  const filePath = file.path;
  const existing = getCachedThumbnailPath(filePath);
  if (existing) return existing;

  const inFlight = inFlightGenerations.get(filePath);
  if (inFlight) {
    const res = await inFlight;
    return res || generateProjectSvgThumbnail(file);
  }

  // Only macOS supports qlmanage
  if (process.platform === "darwin" && fs.existsSync("/usr/bin/qlmanage")) {
    const promise = (async () => {
      try {
        if (!fs.existsSync(filePath)) return null;
        const stats = await fs.promises.stat(filePath);
        const cacheDir = getThumbnailCacheDirectory();
        const cacheKey = getCacheKey(filePath, stats.mtimeMs);
        const finalThumbnailPath = path.join(cacheDir, `${cacheKey}.png`);

        if (fs.existsSync(finalThumbnailPath)) {
          return finalThumbnailPath;
        }

        const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "prem-thumb-"));
        try {
          await execFileAsync("/usr/bin/qlmanage", ["-t", "-s", "512", "-o", tempDir, filePath], {
            timeout: 4000,
          });

          const baseName = path.basename(filePath);
          const expectedGeneratedFile = path.join(tempDir, `${baseName}.png`);

          if (fs.existsSync(expectedGeneratedFile)) {
            await fs.promises.rename(expectedGeneratedFile, finalThumbnailPath);
            return finalThumbnailPath;
          }

          const generatedFiles = await fs.promises.readdir(tempDir);
          const pngCandidate = generatedFiles.find((f) => f.endsWith(".png"));
          if (pngCandidate) {
            await fs.promises.rename(path.join(tempDir, pngCandidate), finalThumbnailPath);
            return finalThumbnailPath;
          }

          return null;
        } finally {
          await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
        }
      } catch {
        return null;
      } finally {
        inFlightGenerations.delete(filePath);
      }
    })();

    inFlightGenerations.set(filePath, promise);
    const generatedPath = await promise;
    if (generatedPath) return generatedPath;
  }

  return generateProjectSvgThumbnail(file);
}

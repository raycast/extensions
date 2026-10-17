import { environment, getPreferenceValues } from "@raycast/api";
import { writeFile, mkdir, access, readdir, stat, unlink } from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";
import crypto from "crypto";

function getAuthHeader(): string {
  const prefs = getPreferenceValues<Preferences>();
  return `Basic ${Buffer.from(`:${prefs.personalAccessToken}`).toString("base64")}`;
}

const cacheDir = path.join(environment.supportPath, "attachments");

// Evict cached attachments older than this so the cache can't grow unbounded.
const MAX_CACHE_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
let prunePromise: Promise<void> | null = null;

/**
 * Delete cached attachment files older than MAX_CACHE_AGE_MS. Runs at most once
 * per session and is best-effort — any error (including a missing cache dir) is
 * ignored so it never interferes with rendering.
 */
function pruneCacheOnce(): Promise<void> {
  if (!prunePromise) {
    prunePromise = (async () => {
      const now = Date.now();
      try {
        const files = await readdir(cacheDir);
        await Promise.all(
          files.map(async (f) => {
            const p = path.join(cacheDir, f);
            try {
              const s = await stat(p);
              if (now - s.mtimeMs > MAX_CACHE_AGE_MS) await unlink(p);
            } catch {
              /* ignore individual file errors */
            }
          }),
        );
      } catch {
        /* cache dir may not exist yet — nothing to prune */
      }
    })();
  }
  return prunePromise;
}

export interface ProcessedImage {
  originalUrl: string;
  localPath: string;
  alt: string;
  filename: string;
}

export interface ProcessedDescription {
  markdown: string;
  images: ProcessedImage[];
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extFromContentType(contentType: string, fallback: string): string {
  const ct = contentType.toLowerCase();
  if (ct.includes("png")) return ".png";
  if (ct.includes("jpeg") || ct.includes("jpg")) return ".jpg";
  if (ct.includes("gif")) return ".gif";
  if (ct.includes("svg")) return ".svg";
  if (ct.includes("webp")) return ".webp";
  return fallback || ".bin";
}

async function findCachedByPrefix(prefix: string): Promise<string | null> {
  try {
    const files = await readdir(cacheDir);
    const match = files.find((f) => f.startsWith(prefix));
    return match ? path.join(cacheDir, match) : null;
  } catch {
    return null;
  }
}

function deriveFilename(url: string, alt: string, ext: string): string {
  const fromAlt = alt
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (fromAlt) return fromAlt.endsWith(ext) ? fromAlt : fromAlt + ext;
  if (!url.startsWith("data:")) {
    try {
      const u = new URL(url);
      const fn = u.searchParams.get("fileName");
      if (fn) return fn;
      const last = decodeURIComponent(u.pathname.split("/").pop() ?? "").trim();
      if (last && !last.includes("attachments")) return last;
    } catch {
      /* ignore */
    }
  }
  return `image${ext}`;
}

async function cacheDataUrl(url: string, alt: string): Promise<{ localPath: string; filename: string }> {
  const m = /^data:([^;,]+)(;base64)?,(.+)$/.exec(url);
  if (!m) throw new Error("Invalid data URL");
  const mime = m[1];
  const isBase64 = !!m[2];
  const data = m[3];
  const ext = extFromContentType(mime, ".bin");

  const hash = crypto.createHash("sha1").update(data).digest("hex").slice(0, 16);

  await mkdir(cacheDir, { recursive: true });
  void pruneCacheOnce();
  const cached = await findCachedByPrefix(hash);
  if (cached) {
    return { localPath: cached, filename: deriveFilename(url, alt, ext) };
  }

  const buf = isBase64 ? Buffer.from(data, "base64") : Buffer.from(decodeURIComponent(data));
  const localPath = path.join(cacheDir, `${hash}${ext}`);
  await writeFile(localPath, buf);
  return { localPath, filename: deriveFilename(url, alt, ext) };
}

async function cacheRemoteUrl(url: string, alt: string): Promise<{ localPath: string; filename: string }> {
  await mkdir(cacheDir, { recursive: true });
  void pruneCacheOnce();
  const hash = crypto.createHash("sha1").update(url).digest("hex").slice(0, 16);

  const cached = await findCachedByPrefix(hash);
  if (cached) {
    return {
      localPath: cached,
      filename: deriveFilename(url, alt, path.extname(cached)),
    };
  }

  const requiresAuth = url.includes("dev.azure.com") || url.includes("visualstudio.com");
  const res = await fetch(url, {
    headers: requiresAuth ? { Authorization: getAuthHeader() } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const contentType = res.headers.get("content-type") ?? "";
  let urlExt = "";
  try {
    urlExt = path.extname(new URL(url).pathname).toLowerCase();
  } catch {
    /* ignore */
  }
  const ext = extFromContentType(contentType, urlExt);
  const localPath = path.join(cacheDir, `${hash}${ext}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(localPath, buf);

  return { localPath, filename: deriveFilename(url, alt, ext) };
}

async function cacheAttachment(url: string, alt: string): Promise<{ localPath: string; filename: string }> {
  if (url.startsWith("data:")) return cacheDataUrl(url, alt);
  return cacheRemoteUrl(url, alt);
}

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".bmp", ".heic"]);

export function isImageFilename(name: string): boolean {
  return IMAGE_EXTS.has(path.extname(name).toLowerCase());
}

/**
 * Convert a local file path into a file:// URL safe to embed in Markdown.
 * Uses pathToFileURL for correct handling of Windows backslash-separated paths
 * and additionally encodes parentheses that would otherwise break ![alt](url) parsing.
 */
export function toMarkdownFileUrl(p: string): string {
  const url = pathToFileURL(p).toString();
  return url.replace(/\(/g, "%28").replace(/\)/g, "%29");
}

export async function fetchAttachmentByName(url: string, name: string): Promise<ProcessedImage> {
  const { localPath } = await cacheRemoteUrl(url, name);
  return {
    originalUrl: url,
    localPath,
    alt: name,
    filename: name,
  };
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

const IMG_RE = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
const ALT_RE = /\balt=["']([^"']*)["']/i;

export async function processDescription(html: string | undefined): Promise<ProcessedDescription> {
  if (!html || !html.trim()) return { markdown: "_No description_", images: [] };

  const matches: { full: string; src: string; alt: string }[] = [];
  let m: RegExpExecArray | null;
  IMG_RE.lastIndex = 0;
  while ((m = IMG_RE.exec(html)) !== null) {
    const altMatch = ALT_RE.exec(m[0]);
    matches.push({
      full: m[0],
      src: decodeEntities(m[1]),
      alt: altMatch ? altMatch[1] : "",
    });
  }

  const cached = await Promise.all(
    matches.map(async ({ src, alt }) => {
      try {
        const { localPath, filename } = await cacheAttachment(src, alt);
        if (!(await fileExists(localPath))) return null;
        return { originalUrl: src, localPath, alt, filename };
      } catch {
        return null;
      }
    }),
  );

  const images: ProcessedImage[] = [];
  const seen = new Set<string>();
  for (const r of cached) {
    if (r && !seen.has(r.localPath)) {
      images.push(r);
      seen.add(r.localPath);
    }
  }

  let processed = html.replace(IMG_RE, (full, rawSrc) => {
    const src = decodeEntities(rawSrc);
    const altMatch = ALT_RE.exec(full);
    const alt = altMatch ? altMatch[1] : "Image";
    const found = images.find((img) => img.originalUrl === src);
    const url = found ? toMarkdownFileUrl(found.localPath) : src;
    return `\n\n![${alt}](${url})\n\n`;
  });

  processed = processed
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { markdown: processed || "_No description_", images };
}

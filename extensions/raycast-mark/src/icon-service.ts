import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import * as fs from "node:fs/promises";
import { get as httpGet } from "node:http";
import { get as httpsGet } from "node:https";
import { BlockList, isIP } from "node:net";
import path from "node:path";
import type { Bookmark, Icon } from "./model.ts";
import { registeredDomainOf, siteColorOf } from "./site-color.ts";

const ICON_FETCH_TIMEOUT_MS = 4000;
const MAX_ICON_BYTES = 2 * 1024 * 1024;
const MAX_HTML_BYTES = 512 * 1024;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const blocked = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const)
  blocked.addSubnet(address, prefix);
for (const [address, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
  ["2001::", 32],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["64:ff9b::", 96],
] as const)
  blocked.addSubnet(address, prefix, "ipv6");

export function isPublicIconAddress(address: string): boolean {
  const family = isIP(address);
  return (
    family !== 0 && !blocked.check(address, family === 4 ? "ipv4" : "ipv6")
  );
}

export function iconsDirectory(libraryRoot: string): string {
  return path.join(libraryRoot, "icons");
}

export async function ensureIconsDirectory(
  libraryRoot: string,
): Promise<string> {
  const dir = iconsDirectory(libraryRoot);
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  return dir;
}

function normalizeTargetUrl(url: string): string | null {
  if (!url) return null;
  let target = url;
  if (/\{[^}]+\}/.test(target)) {
    try {
      const temp = target.replace(/\{[^}]+\}/g, "x");
      const u = new URL(/^https?:\/\//i.test(temp) ? temp : `https://${temp}`);
      target = u.origin;
    } catch {
      target = target.replace(/\{[^}]+\}/g, "");
    }
  }
  if (!/^https?:\/\//i.test(target)) target = `https://${target}`;
  try {
    return new URL(target).href;
  } catch {
    return null;
  }
}

function hostSeed(url: string): string {
  try {
    return registeredDomainOf(new URL(url).hostname);
  } catch {
    return "unknown";
  }
}

function sanitizeHost(host: string): string {
  return host.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80) || "host";
}

function contentHash(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex").slice(0, 12);
}

function extensionForMime(mime: string, url: string): string {
  const type = mime.split(";")[0].trim().toLowerCase();
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  if (type.includes("svg")) return "svg";
  if (type.includes("gif")) return "gif";
  if (type.includes("jpeg") || type.includes("jpg")) return "jpg";
  if (type.includes("icon") || type.includes("ico")) return "ico";
  try {
    const p = new URL(url).pathname.toLowerCase();
    const m = /\.(png|webp|svg|gif|jpe?g|ico)$/.exec(p);
    if (m) return m[1] === "jpeg" ? "jpg" : m[1];
  } catch {
    /* ignore */
  }
  return "ico";
}

function isLikelyImagePath(url: string): boolean {
  try {
    const p = new URL(url).pathname.toLowerCase();
    return /favicon/.test(p) || /\.(ico|png|svg|webp|gif|jpe?g)$/.test(p);
  } catch {
    return false;
  }
}

function guessMimeFromUrl(url: string): string {
  try {
    const p = new URL(url).pathname.toLowerCase();
    if (p.endsWith(".png")) return "image/png";
    if (p.endsWith(".svg")) return "image/svg+xml";
    if (p.endsWith(".webp")) return "image/webp";
    if (p.endsWith(".gif")) return "image/gif";
    if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
    if (p.endsWith(".ico") || /favicon/.test(p)) return "image/x-icon";
  } catch {
    /* ignore */
  }
  return "image/x-icon";
}

function buildTextValue(text: string): string {
  const base = text.trim();
  if (!base) return "•";
  const chars = [...base];
  return chars[0]!.toUpperCase();
}

function textIconFor(title: string, url: string, bgColor: string): Icon {
  const seed = title.trim() || hostSeed(url);
  return {
    type: "text",
    value: buildTextValue(seed),
    bgColor,
    fetchedAt: Date.now(),
  };
}

async function fetchBinary(
  url: string,
  maxBytes: number,
  accept: string,
): Promise<{ bytes: Buffer; contentType: string; finalUrl: string } | null> {
  try {
    const target = new URL(url);
    if (
      !["http:", "https:"].includes(target.protocol) ||
      target.username ||
      target.password
    )
      return null;
    const host = target.hostname.replace(/^\[|\]$/g, "");
    if (/(^|\.)(localhost|local|internal|test|invalid)$/i.test(host))
      return null;
    const addresses = isIP(host)
      ? [{ address: host, family: isIP(host) }]
      : await lookup(host, { all: true });
    if (
      !addresses.length ||
      addresses.some(({ address }) => !isPublicIconAddress(address))
    )
      return null;
    const { address, family } = addresses[0]!;
    // ponytail: Redirects are refused; supporting them requires validating and pinning every hop.
    return await new Promise((resolve) => {
      const get = target.protocol === "https:" ? httpsGet : httpGet;
      const request = get(
        target,
        {
          headers: { "User-Agent": USER_AGENT, Accept: accept },
          lookup: (_hostname, _options, callback) =>
            callback(null, address, family),
        },
        async (response) => {
          if (
            !response.statusCode ||
            response.statusCode < 200 ||
            response.statusCode >= 300 ||
            Number(response.headers["content-length"] || 0) > maxBytes
          ) {
            response.resume();
            resolve(null);
            return;
          }
          const chunks: Buffer[] = [];
          let size = 0;
          try {
            for await (const chunk of response) {
              size += chunk.length;
              if (size > maxBytes) {
                response.destroy();
                resolve(null);
                return;
              }
              chunks.push(chunk);
            }
            resolve({
              bytes: Buffer.concat(chunks),
              contentType: String(response.headers["content-type"] || ""),
              finalUrl: target.href,
            });
          } catch {
            resolve(null);
          }
        },
      );
      const timer = setTimeout(() => request.destroy(), ICON_FETCH_TIMEOUT_MS);
      request.on("close", () => clearTimeout(timer));
      request.on("error", () => resolve(null));
    });
  } catch {
    return null;
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function extractIconHrefs(html: string, baseUrl: string): string[] {
  const hrefs: string[] = [];
  const tags = html.match(/<link\b[^>]*>/gi) || [];
  for (const tag of tags) {
    if (
      !/\brel\s*=\s*["'][^"']*\bicon\b/i.test(tag) &&
      !/\brel\s*=\s*["'][^"']*apple-touch-icon/i.test(tag)
    )
      continue;
    const href =
      /href\s*=\s*"([^"]*)"/i.exec(tag)?.[1] ??
      /href\s*=\s*'([^']*)'/i.exec(tag)?.[1];
    if (!href) continue;
    try {
      hrefs.push(new URL(decodeHtmlEntities(href), baseUrl).href);
    } catch {
      /* ignore */
    }
  }
  return [...new Set(hrefs)];
}

async function discoverIconUrls(pageUrl: string): Promise<string[]> {
  const htmlResult = await fetchBinary(
    pageUrl,
    MAX_HTML_BYTES,
    "text/html,application/xhtml+xml",
  );
  const candidates: string[] = [];
  if (htmlResult) {
    const ct = htmlResult.contentType.toLowerCase();
    if (
      !ct ||
      /text\/html|application\/xhtml|\+xml/.test(ct) ||
      ct.includes("octet-stream")
    ) {
      const html = htmlResult.bytes.toString("utf8");
      candidates.push(...extractIconHrefs(html, htmlResult.finalUrl));
    }
  }
  try {
    candidates.push(new URL("/favicon.ico", pageUrl).href);
  } catch {
    /* ignore */
  }
  return [...new Set(candidates)];
}

async function downloadImage(
  url: string,
): Promise<{ bytes: Buffer; mime: string; url: string } | null> {
  const result = await fetchBinary(url, MAX_ICON_BYTES, "image/*,*/*;q=0.8");
  if (!result) return null;
  const rawType = result.contentType.split(";")[0].trim().toLowerCase();
  let mime = rawType;
  if (rawType.startsWith("image/")) {
    mime = rawType;
  } else if (
    (!rawType || rawType === "application/octet-stream") &&
    isLikelyImagePath(url)
  ) {
    mime = guessMimeFromUrl(url);
  } else {
    return null;
  }
  return { bytes: result.bytes, mime, url: result.finalUrl };
}

async function writeIconFile(
  libraryRoot: string,
  host: string,
  bytes: Buffer,
  mime: string,
  sourceUrl: string,
): Promise<{ path: string; hash: string }> {
  const dir = await ensureIconsDirectory(libraryRoot);
  const hash = contentHash(bytes);
  const ext = extensionForMime(mime, sourceUrl);
  const filename = `${sanitizeHost(host)}-${hash}.${ext}`;
  const filePath = path.join(dir, filename);
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, bytes, { mode: 0o600 });
  }
  return { path: filePath, hash };
}

async function writeLetterSvg(
  libraryRoot: string,
  host: string,
  letter: string,
  bg: string,
  fg: string,
): Promise<{ path: string; hash: string }> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${bg}"/>
  <text x="32" y="42" text-anchor="middle" font-size="30" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-weight="600" fill="${fg}">${letter.replace(/[<&]/g, "")}</text>
</svg>`;
  const bytes = Buffer.from(svg, "utf8");
  return writeIconFile(
    libraryRoot,
    host,
    bytes,
    "image/svg+xml",
    `${host}-letter.svg`,
  );
}

/** Fetch favicon (HTML link rel=icon → /favicon.ico), persist under icons/, else letter tile. */
export async function fetchAndPersistIcon(
  libraryRoot: string,
  bookmarkUrl: string,
  title = "",
): Promise<Icon> {
  const pageUrl = normalizeTargetUrl(bookmarkUrl);
  const seed = pageUrl ? hostSeed(pageUrl) : "unknown";
  const colors = siteColorOf(seed);
  if (!pageUrl) return textIconFor(title, bookmarkUrl, colors.bg);

  const candidates = await discoverIconUrls(pageUrl);
  for (const candidate of candidates) {
    const image = await downloadImage(candidate);
    if (!image) continue;
    const saved = await writeIconFile(
      libraryRoot,
      seed,
      image.bytes,
      image.mime,
      image.url,
    );
    return {
      type: "file",
      path: saved.path,
      hash: saved.hash,
      fetchedAt: Date.now(),
      bgColor: colors.bg,
    };
  }

  const letter = buildTextValue(title.trim() || seed);
  try {
    const saved = await writeLetterSvg(
      libraryRoot,
      seed,
      letter,
      colors.bg,
      colors.fg,
    );
    return {
      type: "file",
      path: saved.path,
      hash: saved.hash,
      fetchedAt: Date.now(),
      bgColor: colors.bg,
    };
  } catch {
    return textIconFor(title, bookmarkUrl, colors.bg);
  }
}

export async function ensureIconForBookmark(
  libraryRoot: string,
  bookmark: Bookmark,
  force = false,
): Promise<Icon> {
  if (!force && bookmark.icon?.type === "file" && bookmark.icon.path) {
    try {
      await fs.access(bookmark.icon.path);
      return bookmark.icon;
    } catch {
      /* missing file — refetch */
    }
  }
  return fetchAndPersistIcon(libraryRoot, bookmark.url, bookmark.title);
}

export async function backfillMissingIcons(
  libraryRoot: string,
  bookmarks: Bookmark[],
  concurrency = 3,
): Promise<Map<string, Icon>> {
  const result = new Map<string, Icon>();
  const missing = bookmarks.filter(
    (b) =>
      !b.isDeleted &&
      (!b.icon ||
        b.icon.type === "text" ||
        (b.icon.type === "file" && !b.icon.path)),
  );
  let index = 0;
  const worker = async () => {
    while (index < missing.length) {
      const bookmark = missing[index++]!;
      try {
        const icon = await ensureIconForBookmark(libraryRoot, bookmark, true);
        result.set(bookmark.id, icon);
      } catch {
        /* skip */
      }
    }
  };
  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, Math.max(missing.length, 1)) },
      () => worker(),
    ),
  );
  return result;
}

/** Raycast List/Detail icon binding from persisted Icon. */
export function iconImageSource(
  icon?: Icon,
): { source: string } | { source: string; tintColor: string } | undefined {
  if (!icon) return undefined;
  if (icon.type === "file" && icon.path) {
    return { source: `file://${icon.path}` };
  }
  if (icon.type === "remote" && (icon.cache || icon.src)) {
    return { source: icon.cache || icon.src! };
  }
  if (icon.type === "custom" && icon.data) {
    return { source: icon.data };
  }
  if (icon.type === "text" && icon.bgColor) {
    // Raycast cannot render letter tiles without a file; tinted bookmark is the fallback.
    return undefined;
  }
  return undefined;
}

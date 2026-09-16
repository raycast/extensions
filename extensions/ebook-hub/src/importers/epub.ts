import { posix } from "node:path";

import { XMLParser } from "fast-xml-parser";
import JSZip from "jszip";
import { NodeHtmlMarkdown } from "node-html-markdown";

import type { NewChapter } from "../domain/book";
import { sanitizeMarkdown } from "../domain/sanitize";
import { countWords, markdownToPlainText } from "../domain/text";
import { isRecord } from "../domain/validation";
import { ImportError, type Importer } from "./types";

const ARRAY_TAGS = new Set(["rootfile", "item", "itemref", "title", "creator", "language"]);
const HTML_MEDIA_TYPES = new Set(["application/xhtml+xml", "text/html"]);
/** Font obfuscation is not DRM; any other algorithm means encrypted content. */
const FONT_OBFUSCATION_ALGORITHMS = new Set(["http://www.idpf.org/2008/embedding", "http://ns.adobe.com/pdf/enc#RC"]);
const MB = 1024 * 1024;

export interface EpubLimits {
  maxEntries: number;
  maxEntryBytes: number;
  maxTotalBytes: number;
}

/** A small archive can expand into gigabytes, so decompression is bounded. */
export const DEFAULT_EPUB_LIMITS: EpubLimits = {
  maxEntries: 5_000,
  maxEntryBytes: 8 * MB,
  maxTotalBytes: 60 * MB,
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  isArray: (tagName: string) => ARRAY_TAGS.has(tagName),
});

class ExpansionBudget {
  private used = 0;

  constructor(private readonly limits: EpubLimits) {}

  /** Refuse an entry before decompressing it when the archive declares its size. */
  reserve(path: string, declaredBytes: number | null): void {
    if (declaredBytes !== null) {
      this.check(path, declaredBytes);
    }
  }

  spend(path: string, bytes: number): void {
    this.check(path, bytes);
    this.used += bytes;
  }

  private check(path: string, bytes: number): void {
    if (bytes > this.limits.maxEntryBytes) {
      throw new ImportError(`${path} expands to more than ${this.limits.maxEntryBytes / MB} MB.`);
    }
    if (this.used + bytes > this.limits.maxTotalBytes) {
      throw new ImportError(`This EPUB expands to more than ${this.limits.maxTotalBytes / MB} MB.`);
    }
  }
}

/** JSZip keeps the uncompressed size while parsing; it is not part of its public API. */
function declaredSize(file: JSZip.JSZipObject): number | null {
  const data = (file as unknown as { _data?: { uncompressedSize?: unknown } })._data;
  return typeof data?.uncompressedSize === "number" ? data.uncompressedSize : null;
}

function child(node: unknown, key: string): unknown {
  return isRecord(node) ? node[key] : undefined;
}

function children(node: unknown, key: string): unknown[] {
  const value = child(node, key);
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function attribute(node: unknown, name: string): string | null {
  const value = child(node, `@_${name}`);
  return typeof value === "string" ? value : null;
}

function textOf(node: unknown): string {
  if (typeof node === "string") {
    return node.trim();
  }
  if (typeof node === "number") {
    return String(node);
  }
  return isRecord(node) ? textOf(node["#text"]) : "";
}

async function readZipText(zip: JSZip, path: string, budget: ExpansionBudget): Promise<string | null> {
  const file = zip.file(path);
  if (!file) {
    return null;
  }
  budget.reserve(path, declaredSize(file));
  const text = await file.async("string");
  budget.spend(path, Buffer.byteLength(text, "utf8"));
  return text;
}

export function hasContentEncryption(encryptionXml: string): boolean {
  const algorithms = [...encryptionXml.matchAll(/Algorithm\s*=\s*"([^"]+)"/g)].map((match) => match[1]);
  return algorithms.some((algorithm) => !FONT_OBFUSCATION_ALGORITHMS.has(algorithm));
}

function decodeHref(href: string): string {
  const path = href.split("#")[0];
  try {
    return decodeURIComponent(path);
  } catch {
    // Malformed percent-encoding: use the href as written.
    return path;
  }
}

export function xhtmlToMarkdown(html: string): { markdown: string; documentTitle: string | null } {
  const documentTitle = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() || null;
  const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html)?.[1] ?? html;
  const withoutScripts = body.replace(/<(script|style|svg)[^>]*>[\s\S]*?<\/\1>/gi, "");
  return { markdown: sanitizeMarkdown(NodeHtmlMarkdown.translate(withoutScripts)), documentTitle };
}

function firstHeading(markdown: string): string | null {
  const match = /^#{1,3}\s+(.+)$/m.exec(markdown);
  return match ? markdownToPlainText(match[1]) : null;
}

export async function importEpubWithLimits(data: Uint8Array, fallbackTitle: string, limits: EpubLimits) {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch (error) {
    throw new ImportError("This file is not a valid EPUB archive.", { cause: error });
  }

  // JSZip also lists folder entries; only real files count against the limit.
  const entryCount = Object.values(zip.files).filter((entry) => !entry.dir).length;
  if (entryCount > limits.maxEntries) {
    throw new ImportError(`This EPUB contains more than ${limits.maxEntries} files.`);
  }
  const budget = new ExpansionBudget(limits);

  const encryption = await readZipText(zip, "META-INF/encryption.xml", budget);
  if (encryption !== null && hasContentEncryption(encryption)) {
    throw new ImportError("This EPUB is DRM-protected and cannot be imported.");
  }

  const containerXml = await readZipText(zip, "META-INF/container.xml", budget);
  if (containerXml === null) {
    throw new ImportError("This EPUB is missing META-INF/container.xml.");
  }
  const rootfile = children(child(child(parser.parse(containerXml), "container"), "rootfiles"), "rootfile")[0];
  const opfPath = attribute(rootfile, "full-path");
  const opfXml = opfPath ? await readZipText(zip, opfPath, budget) : null;
  if (!opfPath || opfXml === null) {
    throw new ImportError("This EPUB has no readable package document.");
  }

  const pkg = child(parser.parse(opfXml), "package");
  const metadata = child(pkg, "metadata");
  const manifest = new Map<string, { href: string; mediaType: string }>();
  for (const item of children(child(pkg, "manifest"), "item")) {
    const id = attribute(item, "id");
    const href = attribute(item, "href");
    if (id && href) {
      manifest.set(id, { href, mediaType: attribute(item, "media-type") ?? "" });
    }
  }

  const opfDir = posix.dirname(opfPath);
  const warnings: string[] = [];
  const chapters: NewChapter[] = [];

  for (const itemref of children(child(pkg, "spine"), "itemref")) {
    if (attribute(itemref, "linear") === "no") {
      continue;
    }
    const idref = attribute(itemref, "idref");
    const item = idref ? manifest.get(idref) : undefined;
    if (!item) {
      warnings.push(`Skipped a spine entry with unknown id "${idref ?? ""}".`);
      continue;
    }
    if (!HTML_MEDIA_TYPES.has(item.mediaType)) {
      continue;
    }
    const path = posix.normalize(opfDir === "." ? decodeHref(item.href) : posix.join(opfDir, decodeHref(item.href)));
    const html = await readZipText(zip, path, budget);
    if (html === null) {
      warnings.push(`Missing chapter file ${path}.`);
      continue;
    }
    const { markdown, documentTitle } = xhtmlToMarkdown(html);
    if (countWords(markdown) === 0) {
      continue;
    }
    chapters.push({ title: firstHeading(markdown) ?? documentTitle ?? `Section ${chapters.length + 1}`, markdown });
  }

  if (chapters.length === 0) {
    throw new ImportError("No readable chapters were found in this EPUB.");
  }

  return {
    title: textOf(children(metadata, "title")[0]) || fallbackTitle,
    authors: children(metadata, "creator")
      .map(textOf)
      .filter((author) => author !== ""),
    language: textOf(children(metadata, "language")[0]) || null,
    chapters,
    warnings,
  };
}

export const importEpub: Importer = (data, fallbackTitle) =>
  importEpubWithLimits(data, fallbackTitle, DEFAULT_EPUB_LIMITS);

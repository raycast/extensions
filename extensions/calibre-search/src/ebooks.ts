import { extname } from "path";

export const EBOOK_EXTENSIONS = new Set([
  ".epub",
  ".mobi",
  ".pdf",
  ".azw",
  ".azw3",
  ".kepub",
  ".lit",
  ".djvu",
]);

export function isEbookFile(filename: string): boolean {
  return EBOOK_EXTENSIONS.has(extname(filename).toLowerCase());
}

export function parseCalibredbOutput(stdout: string): { addedIds: number[] } {
  const match = stdout.match(/Added book ids: (.+)/);
  if (!match) return { addedIds: [] };
  const addedIds = match[1]
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter(Number.isFinite);
  return { addedIds };
}

export function buildCalibredbArgs(
  filePath: string,
  libraryPath: string,
): string[] {
  return ["add", "--library-path", libraryPath, filePath];
}

export function findOpfPathInContainer(containerXml: string): string | null {
  const match = containerXml.match(/full-path="([^"]+)"/);
  return match ? match[1] : null;
}

export function findCoverHrefInOpf(opfXml: string): string | null {
  // EPUB2: <meta name="cover" content="id"> or <meta content="id" name="cover">
  const metaMatch =
    opfXml.match(/<meta\b[^>]*\bname="cover"[^>]*\bcontent="([^"]+)"/i) ??
    opfXml.match(/<meta\b[^>]*\bcontent="([^"]+)"[^>]*\bname="cover"/i);
  if (metaMatch) {
    const id = metaMatch[1];
    const itemMatch =
      opfXml.match(
        new RegExp(`<item\\b[^>]*\\bid="${id}"[^>]*\\bhref="([^"]+)"`, "i"),
      ) ??
      opfXml.match(
        new RegExp(`<item\\b[^>]*\\bhref="([^"]+)"[^>]*\\bid="${id}"`, "i"),
      );
    if (itemMatch) return itemMatch[1];
  }
  // EPUB3: <item properties="cover-image" ...>
  const propMatch =
    opfXml.match(
      /<item\b[^>]*\bproperties="cover-image"[^>]*\bhref="([^"]+)"/i,
    ) ??
    opfXml.match(
      /<item\b[^>]*\bhref="([^"]+)"[^>]*\bproperties="cover-image"/i,
    );
  return propMatch ? propMatch[1] : null;
}

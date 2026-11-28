// Web pages declare their text encoding in three places. Older Czech sites, for
// one, still serve windows-1250 or ISO-8859-2; read as UTF-8 their letters turn
// into question marks. The order follows the HTML standard: a byte-order mark,
// then the Content-Type header, then a <meta> tag near the top, then UTF-8.

const BOMS: [number[], string][] = [
  [[0xef, 0xbb, 0xbf], "utf-8"],
  [[0xff, 0xfe], "utf-16le"],
  [[0xfe, 0xff], "utf-16be"],
];

/** How far into the page to look for a <meta> charset. */
const PRESCAN_BYTES = 4096;

function fromBom(head: Buffer): string | undefined {
  return BOMS.find(([bytes]) => bytes.every((b, i) => head[i] === b))?.[1];
}

function fromContentType(contentType: string | undefined): string | undefined {
  return /charset\s*=\s*["']?([\w.:-]+)/i.exec(contentType ?? "")?.[1];
}

function fromMeta(head: Buffer): string | undefined {
  // Latin-1 maps every byte to one character, so ASCII markup reads the same in any charset.
  const text = head.subarray(0, PRESCAN_BYTES).toString("latin1");
  const direct = /<meta[^>]*?\bcharset\s*=\s*["']?([\w.:-]+)/i.exec(text);
  return direct?.[1];
}

/** The page's charset label, lower-cased: BOM, else header, else <meta>, else `utf-8`. */
export function charsetOf(contentType: string | undefined, head: Buffer): string {
  const bom = fromBom(head);
  if (bom) return bom.toLowerCase();
  // A header label the decoder doesn't know (`utf8mb4`) says nothing: ask the <meta> next.
  const header = fromContentType(contentType)?.toLowerCase();
  if (header && isSupported(header)) return header;
  // The <meta> was readable as ASCII, so the page can't be UTF-16: per the HTML
  // standard, such a label means UTF-8.
  const meta = fromMeta(head)?.toLowerCase();
  if (meta) return /^utf-16/.test(meta) ? "utf-8" : meta;
  return header ?? "utf-8";
}

function isSupported(label: string): boolean {
  try {
    new TextDecoder(label);
    return true;
  } catch {
    return false;
  }
}

function textDecoder(label: string) {
  try {
    return new TextDecoder(label);
  } catch {
    return new TextDecoder("utf-8");
  }
}

/** The page as text, decoded with its declared charset (UTF-8 when the label is unknown). */
export function decodeHtml(body: Buffer, contentType?: string): string {
  // TextDecoder drops a matching BOM itself.
  return textDecoder(charsetOf(contentType, body)).decode(body);
}

const MAX_CHARS = 120;
// Filenames are limited to 255 bytes on APFS/HFS+, and one CJK character costs
// three. Cap bytes too so a long non-Latin title can't overflow the limit.
const MAX_BYTES = 180;

export function slugify(input: string): string {
  const slug = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    // Keep Unicode letters and digits: a [^a-z0-9] class erases Japanese,
    // Chinese, Korean, Cyrillic, Greek, Arabic and Hebrew titles entirely,
    // leaving every such page named after a timestamp.
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_CHARS);

  return trimToBytes(slug, MAX_BYTES).replace(/-+$/g, "");
}

function trimToBytes(value: string, maxBytes: number): string {
  const encoder = new TextEncoder();
  if (encoder.encode(value).length <= maxBytes) return value;

  // Drop whole characters so a multi-byte sequence is never cut in half.
  let bytes = 0;
  let result = "";
  for (const character of value) {
    const size = encoder.encode(character).length;
    if (bytes + size > maxBytes) break;
    bytes += size;
    result += character;
  }
  return result;
}

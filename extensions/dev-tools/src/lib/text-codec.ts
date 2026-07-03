// Text ⇄ encoded-string conversion. Each codec maps text to a textual
// representation and back, byte-for-byte, by routing through a `Buffer`:
//   text --(charset)--> bytes --(format)--> encoded string
// and the reverse for decoding. The charset governs how text becomes bytes
// (UTF-8, etc.); the format governs how those bytes become printable text
// (Base 64, Hex, …). The two axes are independent and chosen separately.

/** How text is turned into bytes (and back). All are lossless round-trips. */
export type Charset = "utf8" | "utf16le" | "latin1";

export const CHARSETS: { id: Charset; label: string }[] = [
  { id: "utf8", label: "UTF-8" },
  { id: "utf16le", label: "UTF-16 LE" },
  { id: "latin1", label: "Latin-1 (ISO-8859-1)" },
];

/** Which textual representation the bytes are rendered as. */
export type Format = "base64" | "base64url" | "base32" | "hex" | "url" | "binary";

/**
 * A codec converts between text and an encoded string. `encode`/`decode` take the
 * charset so the same format works for any text encoding (e.g. URL-encoding the
 * UTF-8 vs. Latin-1 bytes of the same string differs).
 */
export type Codec = {
  id: Format;
  label: string;
  /** Short hint shown next to the format dropdown. */
  info: string;
  encode: (text: string, charset: Charset) => string;
  decode: (encoded: string, charset: Charset) => string;
};

const B32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

// --- byte-level format helpers ----------------------------------------------

function encodeBase32(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buf) {
    value = ((value << 8) | byte) & 0xffffff;
    bits += 8;
    while (bits >= 5) {
      output += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += B32_ALPHABET[(value << (5 - bits)) & 31];
  }
  while (output.length % 8 !== 0) output += "=";
  return output;
}

function decodeBase32(input: string): Buffer {
  const clean = input.replace(/\s+/g, "").replace(/=+$/, "").toUpperCase();
  if (!clean) return Buffer.alloc(0);
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32_ALPHABET.indexOf(ch);
    if (idx === -1) {
      throw new Error(`"${ch}" is not a valid Base 32 character (expected A–Z, 2–7).`);
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
      value &= (1 << bits) - 1;
    }
  }
  return Buffer.from(out);
}

/**
 * Decode standard or URL-safe Base 64, tolerant of whitespace and missing
 * padding. Re-encoding canonicalizes the bytes, so a mismatch reliably pinpoints
 * non-Base-64 input instead of letting `Buffer.from` silently drop bad characters.
 */
function decodeBase64(input: string): Buffer {
  const body = input.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
  if (!/^[A-Za-z0-9+/]*$/.test(body)) {
    throw new Error("Input is not valid Base 64 — it contains characters outside the Base 64 alphabet.");
  }
  const decoded = Buffer.from(body, "base64");
  if (decoded.toString("base64").replace(/=+$/, "") !== body) {
    throw new Error("Input is not valid Base 64.");
  }
  return decoded;
}

function decodeHex(input: string): Buffer {
  const clean = input.replace(/0x/gi, "").replace(/[\s:_-]+/g, "");
  if (!/^[0-9a-fA-F]*$/.test(clean) || clean.length % 2 !== 0) {
    throw new Error("Input is not valid Hex — expected an even number of 0–9/a–f characters.");
  }
  return Buffer.from(clean, "hex");
}

// RFC 3986 unreserved characters are left as-is; every other byte is percent-encoded.
function isUnreserved(byte: number): boolean {
  return (
    (byte >= 0x41 && byte <= 0x5a) || // A-Z
    (byte >= 0x61 && byte <= 0x7a) || // a-z
    (byte >= 0x30 && byte <= 0x39) || // 0-9
    byte === 0x2d || // -
    byte === 0x2e || // .
    byte === 0x5f || // _
    byte === 0x7e // ~
  );
}

function encodeUrl(buf: Buffer): string {
  let out = "";
  for (const byte of buf) {
    out += isUnreserved(byte) ? String.fromCharCode(byte) : "%" + byte.toString(16).toUpperCase().padStart(2, "0");
  }
  return out;
}

function decodeUrl(input: string): Buffer {
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === "%") {
      const hex = input.slice(i + 1, i + 3);
      if (!/^[0-9a-fA-F]{2}$/.test(hex)) {
        throw new Error(`Invalid percent-encoding at "%${input.slice(i + 1, i + 3)}".`);
      }
      bytes.push(parseInt(hex, 16));
      i += 2;
    } else {
      // Literal characters are assumed to be the raw bytes of the payload.
      bytes.push(ch.charCodeAt(0) & 0xff);
    }
  }
  return Buffer.from(bytes);
}

function encodeBinary(buf: Buffer): string {
  return Array.from(buf, (byte) => byte.toString(2).padStart(8, "0")).join(" ");
}

function decodeBinary(input: string): Buffer {
  const clean = input.replace(/\s+/g, "");
  if (!/^[01]*$/.test(clean) || clean.length % 8 !== 0) {
    throw new Error("Input is not valid binary — expected groups of 8 bits (0/1).");
  }
  const out: number[] = [];
  for (let i = 0; i < clean.length; i += 8) {
    out.push(parseInt(clean.slice(i, i + 8), 2));
  }
  return Buffer.from(out);
}

// --- codecs -----------------------------------------------------------------

/** Build a codec whose format is purely a function of the bytes. */
function byteCodec(
  id: Format,
  label: string,
  info: string,
  toText: (buf: Buffer) => string,
  toBytes: (encoded: string) => Buffer,
): Codec {
  return {
    id,
    label,
    info,
    encode: (text, charset) => toText(Buffer.from(text, charset)),
    decode: (encoded, charset) => toBytes(encoded).toString(charset),
  };
}

export const CODECS: Codec[] = [
  byteCodec(
    "base64",
    "Base 64",
    "Standard Base 64 (RFC 4648), with padding.",
    (buf) => buf.toString("base64"),
    decodeBase64,
  ),
  byteCodec(
    "base64url",
    "Base 64 (URL-safe)",
    "URL/filename-safe alphabet (- and _), no padding. Used by JWTs.",
    (buf) => buf.toString("base64url"),
    decodeBase64,
  ),
  byteCodec(
    "base32",
    "Base 32",
    "Base 32 (RFC 4648), uppercase A–Z/2–7 with padding. Used by TOTP secrets.",
    encodeBase32,
    decodeBase32,
  ),
  byteCodec(
    "hex",
    "Hex",
    "Lowercase hex. Decoding ignores spaces, colons, and 0x prefixes.",
    (buf) => buf.toString("hex"),
    decodeHex,
  ),
  byteCodec("url", "URL (percent)", "Percent-encoding of the bytes (RFC 3986).", encodeUrl, decodeUrl),
  byteCodec("binary", "Binary", "Space-separated 8-bit groups, e.g. 01001000 01101001.", encodeBinary, decodeBinary),
];

const CODEC_BY_ID: Record<Format, Codec> = Object.fromEntries(CODECS.map((c) => [c.id, c])) as Record<Format, Codec>;

export function getCodec(format: Format): Codec {
  return CODEC_BY_ID[format];
}

/** Encode `text` to the given format. Returns "" for empty input. */
export function encode(text: string, format: Format, charset: Charset): string {
  if (!text) return "";
  return getCodec(format).encode(text, charset);
}

/** Decode an encoded string back to text. Returns "" for empty input; throws on malformed input. */
export function decode(encoded: string, format: Format, charset: Charset): string {
  if (!encoded) return "";
  return getCodec(format).decode(encoded, charset);
}

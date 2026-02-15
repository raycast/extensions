export type TextEncodingName = "utf8" | "utf16le" | "utf16be";

export interface TextEncoding {
  name: TextEncodingName;
  bom: boolean;
}

export interface DecodedTextBuffer {
  text: string;
  encoding: TextEncoding;
  recoveredFromCorruptUtf16Bom: boolean;
}

const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);
const UTF16LE_BOM = Buffer.from([0xff, 0xfe]);
const UTF16BE_BOM = Buffer.from([0xfe, 0xff]);
const CORRUPT_UTF16LE_PREFIX = Buffer.from([
  0xef, 0xbf, 0xbd, 0xef, 0xbf, 0xbd,
]);

function startsWith(buffer: Buffer, prefix: Buffer): boolean {
  return (
    buffer.length >= prefix.length &&
    buffer.subarray(0, prefix.length).equals(prefix)
  );
}

function detectLikelyUtf16WithoutBom(
  buffer: Buffer,
): TextEncodingName | undefined {
  if (buffer.length < 8) return undefined;

  const sampleLength = Math.min(buffer.length, 4_096);
  let evenZero = 0;
  let oddZero = 0;
  let evenCount = 0;
  let oddCount = 0;

  for (let index = 0; index < sampleLength; index += 1) {
    if (index % 2 === 0) {
      evenCount += 1;
      if (buffer[index] === 0) evenZero += 1;
    } else {
      oddCount += 1;
      if (buffer[index] === 0) oddZero += 1;
    }
  }

  const evenRatio = evenCount > 0 ? evenZero / evenCount : 0;
  const oddRatio = oddCount > 0 ? oddZero / oddCount : 0;
  const ratioThreshold = 0.25;
  const dominanceThreshold = 1.7;

  if (oddRatio > ratioThreshold && oddRatio > evenRatio * dominanceThreshold) {
    return "utf16le";
  }

  if (evenRatio > ratioThreshold && evenRatio > oddRatio * dominanceThreshold) {
    return "utf16be";
  }

  return undefined;
}

function decodeUtf16Le(buffer: Buffer): string {
  if (buffer.length % 2 === 0) {
    return buffer.toString("utf16le");
  }

  const trimmed = buffer.subarray(0, buffer.length - 1);
  return `${trimmed.toString("utf16le")}\uFFFD`;
}

function decodeUtf16Be(buffer: Buffer): string {
  if (buffer.length === 0) return "";

  const evenLength =
    buffer.length % 2 === 0 ? buffer.length : buffer.length - 1;
  const swapped = Buffer.from(buffer.subarray(0, evenLength));
  swapped.swap16();
  const decoded = swapped.toString("utf16le");

  return evenLength === buffer.length ? decoded : `${decoded}\uFFFD`;
}

function decodeWithEncoding(buffer: Buffer, encoding: TextEncoding): string {
  const content = encoding.bom
    ? buffer.subarray(
        encoding.name === "utf8" ? UTF8_BOM.length : UTF16LE_BOM.length,
      )
    : buffer;

  switch (encoding.name) {
    case "utf16le":
      return decodeUtf16Le(content);
    case "utf16be":
      return decodeUtf16Be(content);
    case "utf8":
    default:
      return content.toString("utf8");
  }
}

function detectEncoding(buffer: Buffer): TextEncoding {
  if (startsWith(buffer, UTF8_BOM)) {
    return { name: "utf8", bom: true };
  }

  if (startsWith(buffer, UTF16LE_BOM)) {
    return { name: "utf16le", bom: true };
  }

  if (startsWith(buffer, UTF16BE_BOM)) {
    return { name: "utf16be", bom: true };
  }

  const likelyUtf16 = detectLikelyUtf16WithoutBom(buffer);
  if (likelyUtf16) {
    return { name: likelyUtf16, bom: false };
  }

  return { name: "utf8", bom: false };
}

function tryRecoverCorruptUtf16LePrefix(
  buffer: Buffer,
): DecodedTextBuffer | undefined {
  if (!startsWith(buffer, CORRUPT_UTF16LE_PREFIX)) return undefined;

  const content = buffer.subarray(CORRUPT_UTF16LE_PREFIX.length);
  if (detectLikelyUtf16WithoutBom(content) !== "utf16le") return undefined;

  return {
    text: decodeUtf16Le(content),
    encoding: { name: "utf16le", bom: true },
    recoveredFromCorruptUtf16Bom: true,
  };
}

export function decodeTextBuffer(buffer: Buffer): DecodedTextBuffer {
  if (buffer.length === 0) {
    return {
      text: "",
      encoding: { name: "utf8", bom: false },
      recoveredFromCorruptUtf16Bom: false,
    };
  }

  const recovered = tryRecoverCorruptUtf16LePrefix(buffer);
  if (recovered) return recovered;

  const encoding = detectEncoding(buffer);
  return {
    text: decodeWithEncoding(buffer, encoding),
    encoding,
    recoveredFromCorruptUtf16Bom: false,
  };
}

function encodeUtf16Be(text: string): Buffer {
  const output = Buffer.from(text, "utf16le");
  output.swap16();
  return output;
}

export function encodeTextBuffer(text: string, encoding: TextEncoding): Buffer {
  let body: Buffer;

  switch (encoding.name) {
    case "utf16le":
      body = Buffer.from(text, "utf16le");
      break;
    case "utf16be":
      body = encodeUtf16Be(text);
      break;
    case "utf8":
    default:
      body = Buffer.from(text, "utf8");
      break;
  }

  if (!encoding.bom) return body;

  const bom =
    encoding.name === "utf8"
      ? UTF8_BOM
      : encoding.name === "utf16be"
        ? UTF16BE_BOM
        : UTF16LE_BOM;
  return Buffer.concat([bom, body]);
}

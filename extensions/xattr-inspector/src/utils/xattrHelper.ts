import os from "os";
import path from "path";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { AttributeKind, MACLRecord, PlistSummary } from "../models/XAttrEntry";
import { runCommand } from "./command";

export function isBinaryPlist(buffer: Buffer): boolean {
  return buffer.length >= 6 && buffer.slice(0, 6).toString("ascii") === "bplist";
}

export function bufferToSpacedHex(buffer: Buffer): string {
  return (
    buffer
      .toString("hex")
      .match(/.{1,2}/g)
      ?.join(" ") ?? ""
  );
}

export function normalizeHexInput(value: string): Buffer {
  const hex = value.replace(/\s+/g, "");

  if (!hex) {
    return Buffer.alloc(0);
  }

  if (!/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error("Hex value can only contain 0-9 and A-F characters");
  }

  if (hex.length % 2 !== 0) {
    throw new Error("Hex value must contain an even number of characters");
  }

  return Buffer.from(hex, "hex");
}

export function xattrHexOutputToBuffer(value: string): Buffer {
  return normalizeHexInput(value);
}

function bytesToUpperHex(bytes: Buffer): string {
  return bytes.toString("hex").toUpperCase();
}

function uuidFromBytes(bytes: Buffer): string {
  const hex = bytesToUpperHex(bytes);
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
}

export function parseMACLRecords(buffer: Buffer): MACLRecord[] {
  const recordSize = 18;
  const records: MACLRecord[] = [];

  for (let offset = 0; offset + recordSize <= buffer.length; offset += recordSize) {
    const record = buffer.subarray(offset, offset + recordSize);
    if (record.every((byte) => byte === 0)) {
      continue;
    }

    records.push({
      header: bytesToUpperHex(record.subarray(0, 2)),
      appUUID: uuidFromBytes(record.subarray(2, 18)),
    });
  }

  return records;
}

export async function readAttributeBuffer(filePath: string, name: string): Promise<Buffer> {
  const rawHex = await runCommand("xattr", ["-px", name, filePath]);
  if (typeof rawHex !== "string") {
    throw new Error("Unable to read attribute as hex");
  }

  return xattrHexOutputToBuffer(rawHex);
}

function isProbablyTextBuffer(buffer: Buffer): boolean {
  if (buffer.length === 0) {
    return true;
  }

  const decoded = buffer.toString("utf8");
  if (decoded.includes("\uFFFD")) {
    return false;
  }

  return [...decoded].every((char) => {
    const codePoint = char.codePointAt(0) ?? 0;
    return char === "\n" || char === "\r" || char === "\t" || codePoint >= 0x20;
  });
}

export async function attributeExists(filePath: string, name: string): Promise<boolean> {
  try {
    await runCommand("xattr", ["-p", name, filePath], { encoding: "buffer", trim: false });
    return true;
  } catch {
    return false;
  }
}

export async function getWhereFromsUrls(filePath: string): Promise<string[]> {
  try {
    const whereFroms = await runCommand("mdls", ["-raw", "-name", "kMDItemWhereFroms", filePath]);
    if (typeof whereFroms !== "string") {
      return [];
    }

    const value = whereFroms.trim();
    if (value.startsWith("(") && value.endsWith(")")) {
      return value
        .substring(1, value.length - 1)
        .split(",")
        .map((url) => url.trim().replace(/^"|"$/g, ""))
        .filter((url) => url.length > 0);
    }
  } catch (error) {
    console.error(`Error getting kMDItemWhereFroms:`, error);
  }

  return [];
}

async function convertPlistBuffer(buffer: Buffer): Promise<string | null> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "xattr-"));
  const tempFile = path.join(tempDir, `${Date.now()}.plist`);

  await writeFile(tempFile, buffer);

  try {
    const result = await runCommand("plutil", ["-convert", "xml1", "-o", "-", tempFile], { trim: true });

    if (typeof result === "string" && result && !/not a valid plist/i.test(result)) {
      return result;
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }

  return null;
}

async function convertPlistBufferToJson(buffer: Buffer): Promise<string | null> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "xattr-"));
  const tempFile = path.join(tempDir, `${Date.now()}.plist`);

  await writeFile(tempFile, buffer);

  try {
    const result = await runCommand("plutil", ["-convert", "json", "-o", "-", tempFile], { trim: true });

    if (typeof result === "string" && result) {
      return JSON.stringify(JSON.parse(result), null, 2);
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }

  return null;
}

function decodeXmlText(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function plistXmlToJsonValue(xml: string): unknown {
  const tokens = [...xml.matchAll(/<[^>]+>|[^<]+/g)]
    .map((match) => match[0])
    .filter((token) => token.startsWith("<") || token.trim().length > 0);

  let index = 0;

  function nextMeaningfulToken(): string | undefined {
    while (index < tokens.length) {
      const token = tokens[index++];
      if (!token.startsWith("<") && token.trim().length === 0) {
        continue;
      }
      if (
        token.startsWith("<?") ||
        token.startsWith("<!") ||
        token.startsWith("<plist") ||
        token.startsWith("</plist")
      ) {
        continue;
      }
      return token;
    }

    return undefined;
  }

  function readTextUntil(closeTag: string): string {
    const pieces: string[] = [];

    while (index < tokens.length) {
      const token = tokens[index++];
      if (token === closeTag) {
        break;
      }
      if (!token.startsWith("<")) {
        pieces.push(token);
      }
    }

    return decodeXmlText(pieces.join("").trim());
  }

  function parseValue(startToken?: string): unknown {
    const token = startToken ?? nextMeaningfulToken();
    if (!token) {
      return undefined;
    }

    if (token === "<dict>") {
      const dict: Record<string, unknown> = {};

      while (index < tokens.length) {
        const next = nextMeaningfulToken();
        if (!next || next === "</dict>") {
          break;
        }

        if (next !== "<key>") {
          throw new Error(`Expected <key>, got ${next}`);
        }

        const key = readTextUntil("</key>");
        dict[key] = parseValue();
      }

      return dict;
    }

    if (token === "<array>") {
      const values: unknown[] = [];

      while (index < tokens.length) {
        const next = nextMeaningfulToken();
        if (!next || next === "</array>") {
          break;
        }

        values.push(parseValue(next));
      }

      return values;
    }

    if (token === "<string>") {
      return readTextUntil("</string>");
    }

    if (token === "<integer>") {
      return Number.parseInt(readTextUntil("</integer>"), 10);
    }

    if (token === "<real>") {
      return Number.parseFloat(readTextUntil("</real>"));
    }

    if (token === "<date>") {
      return readTextUntil("</date>");
    }

    if (token === "<data>") {
      return readTextUntil("</data>");
    }

    if (token === "<true/>") {
      return true;
    }

    if (token === "<false/>") {
      return false;
    }

    throw new Error(`Unsupported plist token ${token}`);
  }

  return parseValue();
}

export function plistXmlToJson(xml: string): string {
  return JSON.stringify(plistXmlToJsonValue(xml), null, 2);
}

export async function convertBinaryPlistFromBuffer(buffer: Buffer): Promise<string | null> {
  try {
    return await convertPlistBuffer(buffer);
  } catch (error) {
    console.error(`Error converting plist data:`, error);
    return null;
  }
}

export async function convertBinaryPlistJsonFromBuffer(buffer: Buffer): Promise<string | null> {
  try {
    let json: string | null = null;
    try {
      json = await convertPlistBufferToJson(buffer);
    } catch {
      // Some valid plists, especially NSKeyedArchiver values with CF$UID objects,
      // cannot be emitted by plutil as JSON. Fall back to XML plist parsing below.
    }

    if (json) {
      return json;
    }

    const xml = await convertPlistBuffer(buffer);
    return xml ? plistXmlToJson(xml) : null;
  } catch (error) {
    console.error(`Error converting plist data to JSON:`, error);
    return null;
  }
}

function rootTypeForJson(value: unknown): string {
  if (Array.isArray(value)) {
    return "Array";
  }

  if (value === null) {
    return "Null";
  }

  switch (typeof value) {
    case "object":
      return "Dictionary";
    case "string":
      return "String";
    case "number":
      return "Number";
    case "boolean":
      return "Boolean";
    default:
      return "Value";
  }
}

export function summarizePlistJson(json: string): PlistSummary | undefined {
  try {
    const parsed = JSON.parse(json) as unknown;
    const summary: PlistSummary = { rootType: rootTypeForJson(parsed) };

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const dict = parsed as Record<string, unknown>;
      summary.topLevelKeys = Object.keys(dict).slice(0, 8);

      if (dict.$archiver === "NSKeyedArchiver") {
        summary.archiveType = "NSKeyedArchiver";
      }
    }

    return summary;
  } catch {
    return undefined;
  }
}

export async function convertBinaryPlist(attributeName: string, filePath: string): Promise<string | null> {
  try {
    const buffer = await readAttributeBuffer(filePath, attributeName);
    if (buffer.length === 0) {
      return null;
    }

    return await convertPlistBuffer(buffer);
  } catch (error) {
    console.error(`Error converting plist data:`, error);
  }

  return null;
}

export async function xmlStringToBinaryPlist(xml: string): Promise<Buffer> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "xattr-xml-"));
  const tempFile = path.join(tempDir, `${Date.now()}.plist`);

  await writeFile(tempFile, xml, "utf8");

  try {
    const result = (await runCommand("plutil", ["-convert", "binary1", "-o", "-", tempFile], {
      encoding: "buffer",
      trim: false,
    })) as Buffer;

    return result;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function escapePlistString(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function stringToBinaryPlist(value: string): Promise<Buffer> {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<string>${escapePlistString(value)}</string>
</plist>`;

  return xmlStringToBinaryPlist(xml);
}

export async function stringArrayToBinaryPlist(values: string[]): Promise<Buffer> {
  const strings = values.map((value) => `  <string>${escapePlistString(value)}</string>`).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<array>
${strings}
</array>
</plist>`;

  return xmlStringToBinaryPlist(xml);
}

export function parseStringListInput(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function parseUserTagsInput(value: string): string[] {
  return parseStringListInput(value).map((tag) => {
    const decoded = tag.replace(/\\n/g, "\n");
    return decoded.includes("\n") ? decoded : `${decoded}\n0`;
  });
}

export async function writeAttributeFromBuffer(filePath: string, name: string, buffer: Buffer) {
  if (buffer.length === 0) {
    await runCommand("xattr", ["-w", name, "", filePath]);
    return;
  }

  const hexValue = buffer.toString("hex");
  await runCommand("xattr", ["-wx", name, hexValue, filePath]);
}

export async function renameAttribute(filePath: string, oldName: string, newName: string) {
  const rawBuffer = await readAttributeBuffer(filePath, oldName);

  await writeAttributeFromBuffer(filePath, newName, rawBuffer);

  try {
    await runCommand("xattr", ["-d", oldName, filePath]);
  } catch (deleteErr) {
    try {
      await runCommand("xattr", ["-d", newName, filePath]);
    } catch {
      /* best-effort rollback */
    }
    throw deleteErr;
  }
}

export async function appendFlagToAttribute(filePath: string, attributeName: string, flag: string): Promise<string> {
  const cleanedFlag = flag.trim().replace(/^#+/, "");
  if (!cleanedFlag) {
    throw new Error("Flag cannot be empty");
  }

  const newName = `${attributeName}#${cleanedFlag}`;
  if (await attributeExists(filePath, newName)) {
    throw new Error(`Attribute '${newName}' already exists`);
  }

  await renameAttribute(filePath, attributeName, newName);
  return newName;
}

export async function stripFlagFromAttribute(filePath: string, attributeName: string): Promise<string> {
  const lastHash = attributeName.lastIndexOf("#");
  if (lastHash <= 0) {
    throw new Error("No flag to strip");
  }

  const newName = attributeName.slice(0, lastHash);
  if (!newName.trim()) {
    throw new Error("Invalid attribute name after stripping flag");
  }

  if (await attributeExists(filePath, newName)) {
    throw new Error(`Attribute '${newName}' already exists`);
  }

  await renameAttribute(filePath, attributeName, newName);
  return newName;
}

// Format attribute values based on their type
const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZoneName: "short",
};

function formatDateString(input: string): string | null {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toLocaleString(undefined, DATE_FORMAT_OPTIONS);
}

function formatMdlsListDate(output: string): string | null {
  const match = output.match(/"([^"]+)"/);
  if (!match) {
    return null;
  }
  return formatDateString(match[1]);
}

function decodeEscapedUnicode(text: string): string {
  return text.replace(/\\U([0-9A-Fa-f]{4})/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function formatUserTags(raw: string): string {
  const matches = [...raw.matchAll(/"(.*?)"/g)].map((m) => m[1]);
  if (matches.length === 0) {
    return raw;
  }

  const pieces: string[] = [];
  for (const token of matches) {
    const decoded = decodeEscapedUnicode(token);
    decoded
      .split("\n")
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((part) => pieces.push(part));
  }

  return pieces.join(", ");
}

function extractStringsFromPlistXml(xml: string): string[] {
  return [...xml.matchAll(/<string>([^<]*)<\/string>/g)].map((m) => m[1].trim()).filter(Boolean);
}

export async function dateStringToBinaryPlist(dateString: string): Promise<Buffer> {
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid date");
  }

  const iso = parsed.toISOString().replace(".000Z", "Z");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<date>${iso}</date>
</plist>`;

  return xmlStringToBinaryPlist(xml);
}

export async function formatAttributeValue(
  name: string,
  value: string,
  filePath: string,
  rawBuffer?: Buffer,
): Promise<string> {
  if (!value.trim()) {
    return value;
  }

  if (name === "com.apple.metadata:kMDItemWhereFroms") {
    const urls = await getWhereFromsUrls(filePath);
    return urls.length > 0 ? urls.join("\n") : "No Data";
  }

  if (name === "com.apple.metadata:_kMDItemUserTags") {
    if (rawBuffer && isBinaryPlist(rawBuffer)) {
      const xml = await convertBinaryPlistFromBuffer(rawBuffer);
      if (xml) {
        const tags = extractStringsFromPlistXml(xml);
        if (tags.length > 0) {
          return tags.join(", ");
        }
        return xml;
      }
    }

    try {
      const mdlsValue = await runCommand("mdls", ["-raw", "-name", "_kMDItemUserTags", filePath]);
      if (typeof mdlsValue === "string") {
        const formatted = formatUserTags(mdlsValue);
        if (formatted.trim()) {
          return formatted;
        }
      }
    } catch {
      // fall back
    }

    return formatUserTags(value);
  }

  if (name === "com.apple.metadata:kMDItemDownloadedDate") {
    try {
      const mdlsValue = await runCommand("mdls", ["-raw", "-name", "kMDItemDownloadedDate", filePath]);
      if (typeof mdlsValue === "string") {
        const formatted = formatMdlsListDate(mdlsValue.trim());
        if (formatted) {
          return formatted;
        }
      }
    } catch {
      // mdls failed, fall through to default display
    }
  }

  if (name === "com.apple.lastuseddate#PS") {
    try {
      const mdlsValue = await runCommand("mdls", ["-raw", "-name", "kMDItemLastUsedDate", filePath]);
      if (typeof mdlsValue === "string") {
        const formatted = formatDateString(mdlsValue.trim());
        if (formatted) {
          return formatted;
        }
      }
    } catch {
      // mdls failed, fall through to default display
    }
  }

  if (name.startsWith("com.apple.metadata:")) {
    const mdKey = name.replace("com.apple.metadata:", "");
    try {
      const result = await runCommand("mdls", ["-raw", "-name", mdKey, filePath]);
      if (typeof result === "string") {
        const trimmed = result.trim();
        if (trimmed && trimmed !== "(null)") {
          return trimmed;
        }
      }
    } catch {
      // mdls failed, fall back to default behaviour
    }
  }

  if (name === "com.apple.macl" && rawBuffer) {
    const hex = bufferToSpacedHex(rawBuffer);
    if (hex) {
      return hex;
    }
  }

  if (rawBuffer && isBinaryPlist(rawBuffer)) {
    const converted = await convertBinaryPlistFromBuffer(rawBuffer);
    if (converted) {
      return converted;
    }
  }

  if (rawBuffer && !isProbablyTextBuffer(rawBuffer)) {
    return bufferToSpacedHex(rawBuffer);
  }

  return value;
}

export async function detectAttributeKind(
  name: string,
  rawValue: string,
  filePath: string,
  rawBuffer?: Buffer,
): Promise<{
  kind: AttributeKind;
  editValue: string;
  binaryXml?: string;
  plistJson?: string;
  plistSummary?: PlistSummary;
}> {
  // Explicit hints
  if (name === "com.apple.lastuseddate#PS") {
    try {
      const mdlsValue = await runCommand("mdls", ["-raw", "-name", "kMDItemLastUsedDate", filePath]);
      const editValue = typeof mdlsValue === "string" && mdlsValue.trim() ? mdlsValue.trim() : rawValue;
      return { kind: "plistDate", editValue };
    } catch {
      return { kind: "plistDate", editValue: rawValue };
    }
  }

  if (rawBuffer && isBinaryPlist(rawBuffer)) {
    const xml = await convertBinaryPlistFromBuffer(rawBuffer);
    if (!xml) {
      return { kind: "binary", editValue: bufferToSpacedHex(rawBuffer) };
    }
    const json = await convertBinaryPlistJsonFromBuffer(rawBuffer);
    return {
      kind: "binaryPlist",
      editValue: xml || rawValue,
      binaryXml: xml || undefined,
      plistJson: json || undefined,
      plistSummary: json ? summarizePlistJson(json) : undefined,
    };
  }

  const trimmed = rawValue.trim();
  if (trimmed.startsWith("<?xml") || trimmed.includes("<plist")) {
    const json = rawBuffer ? await convertBinaryPlistJsonFromBuffer(rawBuffer) : undefined;
    return {
      kind: "xmlPlist",
      editValue: rawValue,
      plistJson: json || undefined,
      plistSummary: json ? summarizePlistJson(json) : undefined,
    };
  }

  if (rawBuffer && !isProbablyTextBuffer(rawBuffer)) {
    return { kind: "binary", editValue: bufferToSpacedHex(rawBuffer) };
  }

  return { kind: "text", editValue: rawValue };
}

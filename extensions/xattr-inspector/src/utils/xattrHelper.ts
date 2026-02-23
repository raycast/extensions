import os from "os";
import path from "path";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { AttributeKind } from "../models/XAttrEntry";
import { runCommand } from "./command";

export function isBinaryPlist(buffer: Buffer): boolean {
  return buffer.length >= 6 && buffer.slice(0, 6).toString("ascii") === "bplist";
}

async function attributeExists(filePath: string, name: string): Promise<boolean> {
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

export async function convertBinaryPlist(attributeName: string, filePath: string): Promise<string | null> {
  try {
    const rawHex = await runCommand("xattr", ["-px", attributeName, filePath]);
    if (typeof rawHex !== "string") {
      return null;
    }

    const hex = rawHex.replace(/\s+/g, "");
    if (!hex) {
      return null;
    }

    const buffer = Buffer.from(hex, "hex");

    const tempDir = await mkdtemp(path.join(os.tmpdir(), "xattr-"));
    const tempFile = path.join(tempDir, `${Date.now()}.bin`);

    await writeFile(tempFile, buffer);

    try {
      const result = await runCommand("plutil", ["-convert", "xml1", "-o", "-", tempFile], { trim: true });

      if (typeof result === "string" && result && !/not a valid plist/i.test(result)) {
        return result;
      }
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
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

async function writeAttributeFromBuffer(filePath: string, name: string, buffer: Buffer) {
  if (buffer.length === 0) {
    await runCommand("xattr", ["-w", name, "", filePath]);
    return;
  }

  const hexValue = buffer.toString("hex");
  await runCommand("xattr", ["-wx", name, hexValue, filePath]);
}

export async function renameAttribute(filePath: string, oldName: string, newName: string) {
  const rawBuffer = (await runCommand("xattr", ["-p", oldName, filePath], {
    encoding: "buffer",
    trim: false,
  })) as Buffer;

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

  const iso = parsed.toISOString();
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
      const xml = await convertBinaryPlist(name, filePath);
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
    const hex = rawBuffer
      .toString("hex")
      .match(/.{1,2}/g)
      ?.join(" ");
    if (hex) {
      return hex;
    }
  }

  if (rawBuffer && isBinaryPlist(rawBuffer)) {
    const converted = await convertBinaryPlist(name, filePath);
    if (converted) {
      return converted;
    }
  }

  return value;
}

export async function detectAttributeKind(
  name: string,
  rawValue: string,
  filePath: string,
  rawBuffer?: Buffer,
): Promise<{ kind: AttributeKind; editValue: string; binaryXml?: string }> {
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
    const xml = await convertBinaryPlist(name, filePath);
    return { kind: "binaryPlist", editValue: xml || rawValue, binaryXml: xml || undefined };
  }

  const trimmed = rawValue.trim();
  if (trimmed.startsWith("<?xml") || trimmed.includes("<plist")) {
    return { kind: "xmlPlist", editValue: rawValue };
  }

  return { kind: "text", editValue: rawValue };
}

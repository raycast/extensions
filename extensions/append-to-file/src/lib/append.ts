import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { atomicWriteFile } from "./atomic-write";
import { recordLastAppend } from "./append-history";
import { touchMruFile } from "./cache";
import {
  decodeTextBuffer,
  encodeTextBuffer,
  type TextEncoding,
} from "./encoding";
import { assertPathAllowedByExtensions } from "./file-policy";
import {
  applyAppendStyle,
  type AppendStyle,
  composeAppendedContent,
  type InsertPosition,
} from "./formatting";
import { type ResolvedPreferences } from "./preferences";

export interface AppendOptions {
  style: AppendStyle;
  allowedExtensions: string[];
  separator: string;
  ensureTrailingNewline: boolean;
  timestampFormat: string;
  insertPosition: InsertPosition;
}

interface ExistingFileState {
  text: string;
  encoding: TextEncoding;
  beforeRaw: Buffer | null;
}

export function createAppendOptions(
  preferences: ResolvedPreferences,
  style: AppendStyle,
  insertPosition?: InsertPosition,
): AppendOptions {
  return {
    style,
    allowedExtensions: preferences.allowedExtensions,
    separator: preferences.separator,
    ensureTrailingNewline: preferences.ensureTrailingNewline,
    timestampFormat: preferences.timestampFormat,
    insertPosition: insertPosition ?? preferences.defaultInsertPosition,
  };
}

async function readTextWithEncoding(
  filePath: string,
): Promise<ExistingFileState> {
  try {
    const raw = await readFile(filePath);
    const decoded = decodeTextBuffer(raw);
    return {
      text: decoded.text,
      encoding: decoded.encoding,
      beforeRaw: raw,
    };
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ENOENT") {
      return {
        text: "",
        encoding: { name: "utf8", bom: false },
        beforeRaw: null,
      };
    }

    throw error;
  }
}

export async function appendTextToFile(
  filePath: string,
  text: string,
  options: AppendOptions,
): Promise<void> {
  assertPathAllowedByExtensions(filePath, options.allowedExtensions);

  const entry = applyAppendStyle(text, {
    style: options.style,
    timestampFormat: options.timestampFormat,
  });

  const {
    text: existingText,
    encoding,
    beforeRaw,
  } = await readTextWithEncoding(filePath);
  const merged = composeAppendedContent(existingText, entry, {
    separator: options.separator,
    ensureTrailingNewline: options.ensureTrailingNewline,
    insertPosition: options.insertPosition,
  });
  const encoded = encodeTextBuffer(merged, encoding);

  await mkdir(path.dirname(filePath), { recursive: true });
  await atomicWriteFile(filePath, encoded);
  await touchMruFile(filePath);

  try {
    await recordLastAppend(filePath, beforeRaw, encoded);
  } catch {
    // Keep append successful even when undo snapshot storage fails.
  }
}

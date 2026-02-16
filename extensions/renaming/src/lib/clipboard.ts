/**
 * Clipboard parsing utilities for renaming
 *
 * Parses clipboard text containing file names into a list that can be
 * mapped to selected files for renaming.
 */

import { ClipboardFormat, type ClipboardParseResult, type ClipboardMapping, type FileInfo } from "../types";

/**
 * Parse clipboard text into a list of names
 *
 * Automatically detects the format (newline, tab, or comma separated).
 * Handles common clipboard content like Excel columns, CSV data, or
 * simple lists.
 *
 * @param text - Raw clipboard text
 * @returns Parsed result with names array and format info
 */
export function parseClipboard(text: string): ClipboardParseResult {
  if (!text || text.trim().length === 0) {
    return {
      names: [],
      format: ClipboardFormat.NEWLINE,
      hasExtensions: false,
    };
  }

  // Normalize line endings
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Detect format by checking which delimiter produces more items
  const byNewline = splitByNewline(normalized);
  const byTab = splitByTab(normalized);
  const byComma = splitByComma(normalized);

  // Choose the format that produces the most items
  // (tie-breaker: prefer newline > tab > comma)
  let names: string[];
  let format: ClipboardFormat;

  if (byNewline.length >= byTab.length && byNewline.length >= byComma.length) {
    names = byNewline;
    format = ClipboardFormat.NEWLINE;
  } else if (byTab.length >= byComma.length) {
    names = byTab;
    format = ClipboardFormat.TAB;
  } else {
    names = byComma;
    format = ClipboardFormat.COMMA;
  }

  // Clean up names
  names = names.map((name) => name.trim()).filter((name) => name.length > 0);

  // Check if names appear to include extensions
  const hasExtensions = names.some((name) => {
    const lastDot = name.lastIndexOf(".");
    return lastDot > 0 && lastDot < name.length - 1;
  });

  return {
    names,
    format,
    hasExtensions,
  };
}

/**
 * Split text by newlines
 */
function splitByNewline(text: string): string[] {
  return text.split("\n");
}

/**
 * Split text by tabs
 */
function splitByTab(text: string): string[] {
  // If there are multiple lines with tabs, treat tabs as the primary delimiter
  // This handles Excel columns pasted as tab-separated
  const lines = text.split("\n");
  if (lines.length > 1) {
    // Check if any line has tabs
    const tabsPerLine = lines.filter((l) => l.includes("\t")).length;
    if (tabsPerLine > 0) {
      // Split each line by tabs individually and flatten
      return lines.flatMap((line) => (line.includes("\t") ? line.split("\t") : [line]));
    }
  }
  return text.split("\t");
}

/**
 * Split text by commas
 */
function splitByComma(text: string): string[] {
  // Handle quoted CSV values
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '"') {
      if (inQuotes && i + 1 < text.length && text[i + 1] === '"') {
        // RFC 4180: doubled quote inside quoted field means literal quote
        current += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else if (char === "\n" && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  if (current.length > 0) {
    result.push(current);
  }

  // Remove surrounding quotes from values
  return result.map((value) => {
    if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1);
    }
    return value;
  });
}

/**
 * Map clipboard names to files
 *
 * Creates a mapping between clipboard names and selected files.
 * Files and names are matched in order.
 *
 * @param files - Selected files
 * @param names - Parsed clipboard names
 * @param preserveExtension - Keep original file extensions
 * @returns Array of mappings with status
 */
export function mapClipboardToFiles(
  files: FileInfo[],
  names: string[],
  preserveExtension: boolean = true,
): ClipboardMapping[] {
  return files.map((file, index) => {
    const hasMatch = index < names.length;
    let newName = hasMatch ? names[index]! : file.name;

    if (hasMatch && preserveExtension && file.extension) {
      // Check if the new name already has a plausible file extension
      const lastDot = newName.lastIndexOf(".");
      const hasPlausibleExt =
        lastDot > 0 &&
        lastDot < newName.length - 1 &&
        newName.length - lastDot - 1 <= 6 &&
        /^[a-zA-Z0-9]+$/.test(newName.slice(lastDot + 1));
      if (!hasPlausibleExt) {
        newName = `${newName}${file.extension}`;
      }
    }

    return {
      file,
      newName,
      hasMatch,
    };
  });
}

/**
 * Get status message for clipboard mapping
 *
 * @param files - Number of selected files
 * @param names - Number of clipboard names
 * @returns Status message
 */
export function getClipboardMappingStatus(
  fileCount: number,
  nameCount: number,
): { message: string; type: "success" | "warning" | "error" } {
  if (nameCount === 0) {
    return {
      message: "Clipboard is empty or contains no valid names",
      type: "error",
    };
  }

  if (nameCount === fileCount) {
    return {
      message: `${nameCount} names will be applied to ${fileCount} files`,
      type: "success",
    };
  }

  if (nameCount < fileCount) {
    const extra = fileCount - nameCount;
    return {
      message: `${nameCount} names for ${fileCount} files. ${extra} file${extra > 1 ? "s" : ""} will keep original name${extra > 1 ? "s" : ""}.`,
      type: "warning",
    };
  }

  // nameCount > fileCount
  const unused = nameCount - fileCount;
  return {
    message: `${nameCount} names for ${fileCount} files. ${unused} name${unused > 1 ? "s" : ""} will not be used.`,
    type: "warning",
  };
}

/**
 * Validate clipboard names for potential issues
 *
 * @param names - Parsed clipboard names
 * @returns Validation result
 */
export function validateClipboardNames(names: string[]): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for duplicates
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const name of names) {
    const lower = name.toLowerCase();
    if (seen.has(lower)) {
      duplicates.push(name);
    }
    seen.add(lower);
  }
  if (duplicates.length > 0) {
    errors.push(`Duplicate names found: ${duplicates.slice(0, 3).join(", ")}${duplicates.length > 3 ? "..." : ""}`);
  }

  // Check for invalid characters
  const invalidChars = /[\\/:*?"<>|]/;
  const invalid = names.filter((name) => invalidChars.test(name));
  if (invalid.length > 0) {
    errors.push(`${invalid.length} name${invalid.length > 1 ? "s contain" : " contains"} invalid characters`);
  }

  // Check for empty names
  const empty = names.filter((name) => name.trim().length === 0);
  if (empty.length > 0) {
    errors.push(`${empty.length} empty name${empty.length > 1 ? "s" : ""} found`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Format example for clipboard hint
 */
export function getClipboardFormatHint(format: ClipboardFormat): string {
  switch (format) {
    case ClipboardFormat.NEWLINE:
      return "One name per line";
    case ClipboardFormat.TAB:
      return "Tab-separated names (like from spreadsheet)";
    case ClipboardFormat.COMMA:
      return "Comma-separated names";
  }
}

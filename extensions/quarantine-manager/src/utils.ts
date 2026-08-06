import { execFileSync, spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

export interface XattrInfo {
  name: string;
  value: string;
  isQuarantine: boolean;
  isDangerous: boolean;
}

export interface QuarantineStatus {
  path: string;
  name: string;
  isApp: boolean;
  hasQuarantine: boolean;
  quarantineData: string | null;
  allAttributes: XattrInfo[];
  fileSize: string;
  lastModified: string;
}

export function getFileName(filePath: string): string {
  return path.basename(filePath);
}

export function isApp(filePath: string): boolean {
  return filePath.endsWith(".app") || filePath.includes(".app/");
}

export function isDirectory(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isDirectory();
  } catch {
    return false;
  }
}

/**
 * True if a decoded attribute value contains non-printable control bytes or the
 * Unicode replacement char — i.e. it's raw binary that should be shown as hex
 * rather than printed directly (which would render as � / □).
 */
function looksBinary(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    // Allow tab (9), newline (10), carriage return (13).
    if (c === 9 || c === 10 || c === 13) continue;
    // Other C0 control chars or the Unicode replacement char => binary.
    if (c < 0x20 || c === 0xfffd) return true;
  }
  return false;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function getQuarantineStatus(filePath: string): QuarantineStatus {
  const name = getFileName(filePath);
  const appFlag = isApp(filePath);

  // Get all extended attributes
  let rawAttrs: string[] = [];
  try {
    const output = execFileSync("xattr", [filePath], {
      encoding: "utf8",
      timeout: 5000,
    });
    rawAttrs = output
      .trim()
      .split("\n")
      .filter((a) => a.trim().length > 0);
  } catch {
    rawAttrs = [];
  }

  // Build attribute details
  const allAttributes: XattrInfo[] = rawAttrs.map((attrName) => {
    let value = "";
    try {
      const raw = execFileSync("xattr", ["-p", attrName, filePath], {
        encoding: "utf8",
        timeout: 5000,
      }).toString();
      if (raw.startsWith("bplist")) {
        // Binary plist — get hex and parse with plutil
        try {
          const hex = execFileSync("xattr", ["-px", attrName, filePath], {
            encoding: "utf8",
            timeout: 5000,
          }).trim();
          const buf = Buffer.from(hex.replace(/\s+/g, ""), "hex");
          const parsed = spawnSync("plutil", ["-p", "-"], {
            input: buf,
            encoding: "utf8",
            timeout: 5000,
          });
          if (parsed.status === 0) {
            value = parsed.stdout.trim();
          } else {
            value = hex;
          }
        } catch {
          // Fallback: hex dump
          try {
            value = execFileSync("xattr", ["-px", attrName, filePath], {
              encoding: "utf8",
              timeout: 5000,
            }).trim();
          } catch {
            value = "(unable to read)";
          }
        }
      } else if (looksBinary(raw)) {
        // Raw binary (e.g. com.apple.macl, com.apple.provenance) — show as hex
        // instead of letting non-printable bytes render as � / □.
        try {
          value = execFileSync("xattr", ["-px", attrName, filePath], {
            encoding: "utf8",
            timeout: 5000,
          }).trim();
        } catch {
          value = "(binary data)";
        }
      } else {
        value = raw.trim();
      }
    } catch {
      // Try hex path as a fallback for binary attributes
      try {
        const hex = execFileSync("xattr", ["-px", attrName, filePath], {
          encoding: "utf8",
          timeout: 5000,
        }).trim();
        value = hex;
      } catch {
        value = "(unable to read)";
      }
    }

    const isQuarantine = attrName === "com.apple.quarantine";
    const isDangerous = [
      "com.apple.quarantine",
      "com.apple.metadata:kMDItemWhereFroms",
    ].includes(attrName);

    return { name: attrName, value, isQuarantine, isDangerous };
  });

  const hasQuarantine = rawAttrs.includes("com.apple.quarantine");
  const quarantineAttr = allAttributes.find((a) => a.isQuarantine);
  const quarantineData = quarantineAttr ? quarantineAttr.value : null;

  // File metadata
  let fileSize = "unknown";
  let lastModified = "unknown";
  try {
    const stat = fs.statSync(filePath);
    fileSize = formatFileSize(stat.size);
    lastModified = new Date(stat.mtime).toLocaleString("en-US");
  } catch {
    // ignore
  }

  return {
    path: filePath,
    name,
    isApp: appFlag,
    hasQuarantine,
    quarantineData,
    allAttributes,
    fileSize,
    lastModified,
  };
}

export function removeQuarantine(filePath: string): {
  success: boolean;
  usedAdmin: boolean;
  error?: string;
} {
  // Try without sudo first
  try {
    execFileSync("xattr", ["-dr", "com.apple.quarantine", filePath], {
      timeout: 10000,
    });
    return { success: true, usedAdmin: false };
  } catch (err) {
    // Try with admin privileges via osascript
    try {
      execFileSync(
        "osascript",
        [
          "-e",
          "on run argv",
          "-e",
          "set p to item 1 of argv",
          "-e",
          'do shell script "xattr -dr com.apple.quarantine " & quoted form of POSIX path p with administrator privileges',
          "-e",
          "end run",
          filePath,
        ],
        { timeout: 30000 },
      );
      return { success: true, usedAdmin: true };
    } catch (adminErr) {
      const error =
        adminErr instanceof Error ? adminErr.message : String(adminErr);
      return { success: false, usedAdmin: false, error };
    }
  }
}

/**
 * Runs `xattr <flags> com.apple.quarantine <paths…>` behind ONE administrator
 * prompt, quoting each path safely inside AppleScript. `flags` is always an
 * internal literal, never user input.
 */
function removeWithAdmin(
  flags: string,
  paths: string[],
): { success: boolean; usedAdmin: boolean; error?: string } {
  try {
    execFileSync(
      "osascript",
      [
        "-e",
        "on run argv",
        "-e",
        `set cmd to "xattr ${flags} com.apple.quarantine"`,
        "-e",
        "repeat with p in argv",
        "-e",
        'set cmd to cmd & " " & quoted form of (contents of p)',
        "-e",
        "end repeat",
        "-e",
        "do shell script cmd with administrator privileges",
        "-e",
        "end run",
        ...paths,
      ],
      { timeout: 120000 },
    );
    return { success: true, usedAdmin: true };
  } catch (adminErr) {
    const error =
      adminErr instanceof Error ? adminErr.message : String(adminErr);
    return { success: false, usedAdmin: false, error };
  }
}

/**
 * Removes com.apple.quarantine from a specific set of paths in a single pass
 * (non-recursive `xattr -d`, so only the named paths are touched). Tries without
 * elevated privileges first, then falls back to ONE administrator prompt that
 * covers every path, so a batch removal never chains multiple password dialogs.
 */
export function removeQuarantineFromPaths(paths: string[]): {
  success: boolean;
  usedAdmin: boolean;
  error?: string;
} {
  if (paths.length === 0) return { success: true, usedAdmin: false };

  // Fast path: clear everything in one call.
  try {
    execFileSync("xattr", ["-d", "com.apple.quarantine", ...paths], {
      timeout: 30000,
    });
    return { success: true, usedAdmin: false };
  } catch {
    // `xattr -d` aborts the whole batch if ANY path lacks the attribute (already
    // cleared, removed between scan and action, etc.). Retry each path on its own
    // so one already-clean file doesn't force the entire selection to escalate —
    // only paths that fail for a real reason (e.g. permissions) need admin.
    const needsAdmin: string[] = [];
    for (const p of paths) {
      const res = spawnSync("xattr", ["-d", "com.apple.quarantine", p], {
        encoding: "utf8",
        timeout: 10000,
      });
      if (res.status === 0) continue;
      // Nothing to remove (attribute or file already gone) — treat as cleared.
      if (/No such xattr|No such file/i.test(res.stderr ?? "")) continue;
      needsAdmin.push(p);
    }

    if (needsAdmin.length === 0) return { success: true, usedAdmin: false };

    // One admin prompt covering only the paths that were genuinely blocked.
    return removeWithAdmin("-d", needsAdmin);
  }
}

/**
 * Clears com.apple.quarantine from the given paths AND everything inside them
 * (`xattr -dr`). Unlike the non-recursive form, `xattr -dr` succeeds on paths
 * that lack the attribute, so no per-path retry pass is needed. Used when a
 * scan finds more quarantined items than the list shows — the recursive sweep
 * clears the whole tree, including the items that were never listed.
 */
export function removeQuarantineRecursivelyFromPaths(paths: string[]): {
  success: boolean;
  usedAdmin: boolean;
  error?: string;
} {
  if (paths.length === 0) return { success: true, usedAdmin: false };

  try {
    execFileSync("xattr", ["-dr", "com.apple.quarantine", ...paths], {
      timeout: 120000,
    });
    return { success: true, usedAdmin: false };
  } catch {
    return removeWithAdmin("-dr", paths);
  }
}

export function removeAllAttributes(
  filePath: string,
  recursive = false,
): {
  success: boolean;
  usedAdmin: boolean;
  error?: string;
} {
  const flag = recursive ? "-cr" : "-c";
  try {
    execFileSync("xattr", [flag, filePath], { timeout: 10000 });
    return { success: true, usedAdmin: false };
  } catch {
    try {
      execFileSync(
        "osascript",
        [
          "-e",
          "on run argv",
          "-e",
          "set p to item 1 of argv",
          "-e",
          `do shell script "xattr ${flag} " & quoted form of POSIX path p with administrator privileges`,
          "-e",
          "end run",
          filePath,
        ],
        { timeout: 30000 },
      );
      return { success: true, usedAdmin: true };
    } catch (adminErr) {
      const error =
        adminErr instanceof Error ? adminErr.message : String(adminErr);
      return { success: false, usedAdmin: false, error };
    }
  }
}

/**
 * Returns every item currently selected in Finder (empty if nothing is selected).
 * Uses spawnSync to avoid blocking React's event loop. One POSIX path per line.
 */
export function getFinderSelections(): string[] {
  const result = spawnSync(
    "osascript",
    [
      "-e",
      `tell application "Finder"`,
      "-e",
      `set out to ""`,
      "-e",
      `repeat with anItem in (get selection)`,
      "-e",
      `set out to out & POSIX path of (anItem as alias) & linefeed`,
      "-e",
      `end repeat`,
      "-e",
      `return out`,
      "-e",
      `end tell`,
    ],
    { encoding: "utf8", timeout: 5000 },
  );

  return (result.stdout ?? "")
    .split("\n")
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && fs.existsSync(p));
}

/** Keeps only the paths that still exist on disk. */
export function existingPaths(paths: string[]): string[] {
  return paths.filter((p) => fs.existsSync(p));
}

export interface ParsedQuarantine {
  source: string;
  date: string;
  flags: string[];
  uuid: string;
  rawFlags: string;
  /** Unix epoch (seconds) of the download, for sorting; null if unparseable */
  epoch: number | null;
}

/**
 * Expands `\xNN` escapes that some downloaders write into the quarantine record
 * — Free Download Manager stores its name as `Free\x20Download\x20Manager`, and
 * the escape is in the stored attribute itself, not an artifact of reading it.
 * Only printable results are substituted, so a decoded control byte can never
 * end up in a list title. Applied per field AFTER splitting on ";" so a decoded
 * `\x3b` cannot fabricate an extra field.
 */
function decodeXattrEscapes(value: string): string {
  if (!value.includes("\\x")) return value;
  return value.replace(/\\x([0-9a-fA-F]{2})/g, (match, hex) => {
    const code = parseInt(hex, 16);
    return code >= 0x20 && code !== 0x7f ? String.fromCharCode(code) : match;
  });
}

export function parseQuarantineData(rawValue: string): ParsedQuarantine | null {
  // Format: FLAGHEX;TIMESTAMP_HEX;APPNAME;UUID
  const parts = rawValue.split(";");
  if (parts.length < 2) return null;

  const flagHex = parts[0] ?? "";
  const timestamp = parts[1] ?? "";
  const appName = decodeXattrEscapes(parts[2] ?? "");
  const uuid = parts[3] ?? "";

  const flagInt = parseInt(flagHex, 16);
  const flags: string[] = [];
  if (flagInt & 0x0001) flags.push("Downloaded from Internet");
  if (flagInt & 0x0002) flags.push("Sandbox");
  if (flagInt & 0x0040) flags.push("User-approved");
  if (flagInt & 0x0080) flags.push("Gatekeeper passed");
  if (flags.length === 0) flags.push("Quarantined");

  let dateStr = "Unknown";
  let epoch: number | null = null;
  if (timestamp.length === 8) {
    // Hex seconds since the Unix epoch — NOT Mac absolute time (2001-01-01).
    // Verified against real records: Free Download Manager's stamp on Final Cut
    // Pro reads 2026-06-28 as Unix seconds, and 2057 if the 2001 offset is added.
    const ts = parseInt(timestamp, 16);
    if (!isNaN(ts)) {
      epoch = ts;
      dateStr = new Date(epoch * 1000).toLocaleString("en-US");
    }
  }

  return {
    source: appName || "Unknown",
    date: dateStr,
    flags,
    uuid,
    rawFlags: flagHex,
    epoch,
  };
}

export function parseQuarantineFlags(rawValue: string): string {
  const parsed = parseQuarantineData(rawValue);
  if (!parsed) return rawValue;
  return `Source: ${parsed.source} | Date: ${parsed.date} | Flags: ${parsed.flags.join(", ")}`;
}

const QUARANTINE_ATTR = "com.apple.quarantine";

/**
 * Upper bound on how many quarantined items are listed — applied per directory
 * here, and again across the whole selection by the caller. A .app installed
 * from a DMG or zip carries the flag on EVERY file inside it (Final Cut Pro:
 * ~38k), and rendering one row — each with its own action panel and detail
 * view — per file exhausts the extension's heap. Items past the cap are
 * reported as a count and cleared via recursive removal.
 */
export const MAX_SCAN_ENTRIES = 500;

export interface DirEntry {
  path: string;
  name: string;
  relativePath: string;
  quarantineData: string | null;
}

export interface DirectoryScan {
  path: string;
  name: string;
  isApp: boolean;
  /** "recursive" for .app bundles, "shallow" (immediate children) for folders */
  scanMode: "recursive" | "shallow";
  /** The directory's own com.apple.quarantine attribute, if any */
  rootQuarantineData: string | null;
  /** Quarantined items found inside the directory (excludes the root itself), capped at MAX_SCAN_ENTRIES */
  entries: DirEntry[];
  /** Quarantined items found before the cap was applied */
  totalFound: number;
  /**
   * How many items were examined for quarantine. Only computed when nothing was
   * found (the sole place it is displayed); null otherwise, so a large tree is
   * never walked twice just to produce a number no one sees.
   */
  scannedCount: number | null;
  /** Set when the scan could not run to completion, so partial output is never presented as a clean result */
  scanError: string | null;
  lastModified: string;
}

/**
 * Counts filesystem entries under a directory. Shallow counts immediate children;
 * recursive descends the whole tree (not following symlinks). Used only to report
 * the scan scope, so failures are swallowed and counted as zero.
 */
function countEntries(dirPath: string, recursive: boolean): number {
  let count = 0;
  let children: fs.Dirent[];
  try {
    children = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const child of children) {
    count++;
    if (recursive && child.isDirectory() && !child.isSymbolicLink()) {
      count += countEntries(path.join(dirPath, child.name), true);
    }
  }
  return count;
}

/**
 * Reads the value of com.apple.quarantine for a single path.
 * Returns the raw value, or null if the attribute is absent.
 */
export function readQuarantineValue(filePath: string): string | null {
  const res = spawnSync("xattr", ["-p", QUARANTINE_ATTR, filePath], {
    encoding: "utf8",
    timeout: 5000,
  });
  if (res.status === 0) {
    return (res.stdout ?? "").trim();
  }
  return null;
}

const QUARANTINE_LINE = /^(.*): ([0-9a-fA-F]*;[0-9a-fA-F]*;.*)$/;

/**
 * Splits one `xattr -p` output line into its path and value. A path can itself
 * contain ": " (a file may legitimately be named "a: b"), so the split is
 * anchored on the quarantine value's shape — `<flags>;<timestamp>;` — with a
 * greedy path match, which lands on the last viable separator.
 */
function parseQuarantineLine(
  line: string,
): { path: string; value: string } | null {
  const match = QUARANTINE_LINE.exec(line);
  if (match) return { path: match[1], value: match[2] };
  // A value that doesn't follow the documented shape still carries a path
  // prefix; fall back to the first separator rather than dropping the entry.
  const idx = line.indexOf(": ");
  if (idx <= 0) return null;
  return { path: line.slice(0, idx), value: line.slice(idx + 2) };
}

/**
 * Turns `xattr -p com.apple.quarantine` output (one `<path>: <value>` line per
 * match) into entries appended to `entries`, skipping `dirPath` itself — it is
 * reported separately as the root, and in shallow mode it is also passed as a
 * sentinel argument. Stops collecting at MAX_SCAN_ENTRIES but keeps counting,
 * so the caller can report how much was left out. Returns the count found.
 */
function collectEntries(
  stdout: string,
  dirPath: string,
  entries: DirEntry[],
): number {
  let found = 0;
  for (const line of stdout.split("\n")) {
    if (!line) continue;
    const parsed = parseQuarantineLine(line);
    if (!parsed || !parsed.path || parsed.path === dirPath) continue;
    found++;
    if (entries.length >= MAX_SCAN_ENTRIES) continue;
    entries.push({
      path: parsed.path,
      name: getFileName(parsed.path),
      relativePath:
        path.relative(dirPath, parsed.path) || getFileName(parsed.path),
      quarantineData: parsed.value.trim(),
    });
  }
  return found;
}

/**
 * Describes why a spawned scan could not complete. `status` is deliberately
 * ignored: `xattr -p` exits non-zero whenever ANY path lacks the attribute,
 * which is the normal case, so only a spawn-level error (ENOBUFS from a
 * truncated buffer, ETIMEDOUT from the timeout) means the output is incomplete.
 */
function scanFailure(error: Error | undefined, what: string): string | null {
  if (!error) return null;
  const code = (error as NodeJS.ErrnoException).code;
  if (code === "ENOBUFS") {
    return `${what} produced more output than could be read — results are incomplete.`;
  }
  if (code === "ETIMEDOUT") {
    return `${what} timed out — results are incomplete.`;
  }
  return `${what} failed: ${error.message}`;
}

/**
 * Scans a directory for quarantined files. .app bundles are scanned recursively
 * (they are self-contained); plain folders are scanned one level deep so large
 * trees stay responsive.
 */
export function scanDirectory(dirPath: string): DirectoryScan {
  const name = getFileName(dirPath);
  const appFlag = isApp(dirPath);
  const scanMode: "recursive" | "shallow" = appFlag ? "recursive" : "shallow";

  // The directory's own quarantine flag.
  const rootQuarantineData = readQuarantineValue(dirPath);

  // Read paths AND values in one pass. Asking xattr for the quarantine
  // attribute directly (rather than listing every attribute and then reading
  // each match back individually) turns a 1 + N process storm — one `xattr -p`
  // per quarantined file, ~2ms each — into a single call per batch.
  const entries: DirEntry[] = [];
  let totalFound = 0;
  let scanError: string | null = null;

  if (scanMode === "recursive") {
    const res = spawnSync("xattr", ["-p", QUARANTINE_ATTR, "-r", dirPath], {
      encoding: "utf8",
      timeout: 120000,
      maxBuffer: 32 * 1024 * 1024,
    });
    scanError = scanFailure(res.error, "Scanning this bundle");
    totalFound = collectEntries(res.stdout ?? "", dirPath, entries);
  } else {
    let children: string[] = [];
    try {
      children = fs.readdirSync(dirPath).map((c) => path.join(dirPath, c));
    } catch {
      children = [];
    }
    // Process children in chunks to stay well under ARG_MAX, and append dirPath
    // as a sentinel so every call has >= 2 path arguments. With a single path,
    // xattr prints the bare value (no "<path>: " prefix); the extra arg forces
    // the prefixed format so a lone quarantined child is never missed.
    const CHUNK = 256;
    for (let i = 0; i < children.length; i += CHUNK) {
      const batch = children.slice(i, i + CHUNK);
      const res = spawnSync(
        "xattr",
        ["-p", QUARANTINE_ATTR, ...batch, dirPath],
        {
          encoding: "utf8",
          timeout: 30000,
          maxBuffer: 32 * 1024 * 1024,
        },
      );
      scanError = scanError ?? scanFailure(res.error, "Scanning this folder");
      totalFound += collectEntries(res.stdout ?? "", dirPath, entries);
    }
  }

  // Only worth walking the tree for a scope number when there is nothing to
  // show — with findings present, the count is never displayed.
  const scannedCount =
    totalFound === 0 ? countEntries(dirPath, scanMode === "recursive") : null;

  let lastModified = "unknown";
  try {
    lastModified = new Date(fs.statSync(dirPath).mtime).toLocaleString("en-US");
  } catch {
    // ignore
  }

  return {
    path: dirPath,
    name,
    isApp: appFlag,
    scanMode,
    rootQuarantineData,
    entries,
    totalFound,
    scannedCount,
    scanError,
    lastModified,
  };
}

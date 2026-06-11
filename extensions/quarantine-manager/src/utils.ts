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

    // One admin prompt covering only the paths that were genuinely blocked,
    // quoting each one safely inside AppleScript.
    try {
      execFileSync(
        "osascript",
        [
          "-e",
          "on run argv",
          "-e",
          'set cmd to "xattr -d com.apple.quarantine"',
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
          ...needsAdmin,
        ],
        { timeout: 60000 },
      );
      return { success: true, usedAdmin: true };
    } catch (adminErr) {
      const error =
        adminErr instanceof Error ? adminErr.message : String(adminErr);
      return { success: false, usedAdmin: false, error };
    }
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
 * Returns the currently selected file in Finder, or null if nothing is selected.
 * Uses spawnSync to avoid blocking React's event loop.
 */
export function getFinderSelection(): string | null {
  const result = spawnSync(
    "osascript",
    [
      "-e",
      `tell application "Finder"`,
      "-e",
      `set sel to selection`,
      "-e",
      `if (count of sel) > 0 then return POSIX path of (item 1 of sel as alias)`,
      "-e",
      `end tell`,
    ],
    { encoding: "utf8", timeout: 5000 },
  );

  const selected = (result.stdout ?? "").trim();
  if (selected.length > 0 && fs.existsSync(selected)) {
    return selected;
  }
  return null;
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

export function parseQuarantineData(rawValue: string): ParsedQuarantine | null {
  // Format: FLAGHEX;TIMESTAMP_HEX;APPNAME;UUID
  const parts = rawValue.split(";");
  if (parts.length < 2) return null;

  const flagHex = parts[0] ?? "";
  const timestamp = parts[1] ?? "";
  const appName = parts[2] ?? "";
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
    const mac2001Epoch = 978307200;
    const ts = parseInt(timestamp, 16);
    if (!isNaN(ts)) {
      epoch = ts + mac2001Epoch;
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

const QUARANTINE_SUFFIX = ": com.apple.quarantine";

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
  /** Quarantined items found inside the directory (excludes the root itself) */
  entries: DirEntry[];
  /** How many items were examined for quarantine (immediate for shallow, all descendants for recursive) */
  scannedCount: number;
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
function readQuarantineValue(filePath: string): string | null {
  const res = spawnSync("xattr", ["-p", "com.apple.quarantine", filePath], {
    encoding: "utf8",
    timeout: 5000,
  });
  if (res.status === 0) {
    return (res.stdout ?? "").trim();
  }
  return null;
}

/**
 * Parses `xattr` listing output (one `<path>: <attr>` line per attribute) and
 * returns the paths that carry com.apple.quarantine. Matching on the exact
 * suffix keeps paths containing ": " intact.
 */
function collectQuarantinedPaths(
  stdout: string,
  excludePath?: string,
): string[] {
  const paths: string[] = [];
  for (const line of stdout.split("\n")) {
    if (!line.endsWith(QUARANTINE_SUFFIX)) continue;
    const p = line.slice(0, -QUARANTINE_SUFFIX.length);
    if (p && p !== excludePath) paths.push(p);
  }
  return paths;
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

  // List candidate paths in a single batched call.
  let quarantinedPaths: string[] = [];
  let scannedCount = 0;
  if (scanMode === "recursive") {
    scannedCount = countEntries(dirPath, true);
    const res = spawnSync("xattr", ["-r", dirPath], {
      encoding: "utf8",
      timeout: 60000,
      maxBuffer: 64 * 1024 * 1024,
    });
    quarantinedPaths = collectQuarantinedPaths(res.stdout ?? "", dirPath);
  } else {
    let children: string[] = [];
    try {
      children = fs.readdirSync(dirPath).map((c) => path.join(dirPath, c));
    } catch {
      children = [];
    }
    scannedCount = children.length;
    // Process children in chunks to stay well under ARG_MAX, and append dirPath
    // as a sentinel so every call has >= 2 path arguments. With a single path,
    // xattr prints bare attribute names (no "<path>: " prefix); the extra arg
    // forces the prefixed format so a lone quarantined child is never missed.
    const CHUNK = 256;
    for (let i = 0; i < children.length; i += CHUNK) {
      const batch = children.slice(i, i + CHUNK);
      const res = spawnSync("xattr", [...batch, dirPath], {
        encoding: "utf8",
        timeout: 30000,
        maxBuffer: 64 * 1024 * 1024,
      });
      quarantinedPaths.push(
        ...collectQuarantinedPaths(res.stdout ?? "", dirPath),
      );
    }
  }

  // Fetch values only for the (typically small) set of quarantined paths.
  const entries: DirEntry[] = quarantinedPaths.map((p) => ({
    path: p,
    name: getFileName(p),
    relativePath: path.relative(dirPath, p) || getFileName(p),
    quarantineData: readQuarantineValue(p),
  }));

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
    scannedCount,
    lastModified,
  };
}

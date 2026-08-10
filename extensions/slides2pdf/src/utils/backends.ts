import { execFileSync, spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

export type BackendType = "keynote" | "powerpoint" | "pages" | "word" | "numbers" | "excel" | "libreoffice" | "sips";

export interface Backend {
  type: BackendType;
  label: string;
  path: string;
  appName?: string;
}

export type FileCategory = "presentation" | "document" | "spreadsheet" | "image" | "other";

const PRESENTATION_EXTS = new Set([".pptx", ".ppt", ".pps", ".ppsx", ".key", ".odp"]);
const DOCUMENT_EXTS = new Set([".docx", ".doc", ".pages", ".odt", ".rtf", ".txt"]);
const SPREADSHEET_EXTS = new Set([".xlsx", ".xls", ".numbers", ".ods", ".csv"]);
const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".tiff", ".tif", ".bmp", ".heic", ".webp"]);

// Per-backend: which extensions can it actually open?
// iWork apps open their native format + MS formats but not ODF; MS apps open ODF but not iWork formats;
// LibreOffice opens everything except iWork formats.
const APPLE_NATIVE_EXTS = new Set([".key", ".pages", ".numbers"]);
const BACKEND_EXTS: Record<BackendType, Set<string>> = {
  keynote: new Set([".key", ".pptx", ".ppt"]),
  powerpoint: new Set([".pptx", ".ppt", ".pps", ".ppsx", ".odp"]),
  pages: new Set([".pages", ".docx", ".doc", ".rtf", ".txt"]),
  word: new Set([".docx", ".doc", ".odt", ".rtf", ".txt"]),
  numbers: new Set([".numbers", ".xlsx", ".xls", ".csv"]),
  excel: new Set([".xlsx", ".xls", ".ods", ".csv"]),
  libreoffice: new Set(
    [...PRESENTATION_EXTS, ...DOCUMENT_EXTS, ...SPREADSHEET_EXTS, ...IMAGE_EXTS].filter(
      (e) => !APPLE_NATIVE_EXTS.has(e),
    ),
  ),
  sips: IMAGE_EXTS,
};

// Priority order per file category (fallback when no per-extension order applies)
const PRIORITY: Record<FileCategory, BackendType[]> = {
  presentation: ["powerpoint", "keynote", "libreoffice"],
  document: ["word", "pages", "libreoffice"],
  spreadsheet: ["excel", "numbers", "libreoffice"],
  image: ["sips", "libreoffice"],
  other: ["libreoffice"],
};

// The app whose native format a file is in renders it most faithfully, so it goes first:
// MS formats → MS app, iWork formats → iWork app, ODF → LibreOffice.
const EXT_PRIORITY: Record<string, BackendType[]> = {
  ".pptx": ["powerpoint", "keynote", "libreoffice"],
  ".ppt": ["powerpoint", "keynote", "libreoffice"],
  ".key": ["keynote"],
  ".odp": ["libreoffice", "powerpoint"],
  ".docx": ["word", "pages", "libreoffice"],
  ".doc": ["word", "pages", "libreoffice"],
  ".pages": ["pages"],
  ".odt": ["libreoffice", "word"],
  ".xlsx": ["excel", "numbers", "libreoffice"],
  ".xls": ["excel", "numbers", "libreoffice"],
  ".numbers": ["numbers"],
  ".ods": ["libreoffice", "excel"],
};

const SOFFICE_BINS = [
  "/Applications/LibreOffice.app/Contents/MacOS/soffice",
  "/opt/homebrew/bin/soffice",
  "/usr/local/bin/soffice",
];

// Filesystem-based detection — avoids `osascript "path to application"`, which can launch apps as a side effect
const APP_SEARCH_DIRS = [
  "/Applications",
  "/System/Applications",
  process.env.HOME ? path.join(process.env.HOME, "Applications") : "",
].filter(Boolean);

// Each backend lists every bundle name it might appear under.
// "Creator Studio" variants are App Store editions sold under a different bundle name.
export type AppBackendType = "keynote" | "powerpoint" | "pages" | "word" | "numbers" | "excel";
const APP_CANDIDATES: Record<AppBackendType, string[]> = {
  keynote: ["Keynote", "Keynote Creator Studio"],
  powerpoint: ["Microsoft PowerPoint", "Microsoft PowerPoint Creator Studio"],
  pages: ["Pages", "Pages Creator Studio"],
  word: ["Microsoft Word", "Microsoft Word Creator Studio"],
  numbers: ["Numbers", "Numbers Creator Studio"],
  excel: ["Microsoft Excel", "Microsoft Excel Creator Studio"],
};

function findApp(candidates: string[]): { path: string; name: string } | null {
  for (const dir of APP_SEARCH_DIRS) {
    for (const name of candidates) {
      const p = path.join(dir, `${name}.app`);
      if (fs.existsSync(p)) return { path: p, name };
    }
  }
  return null;
}

function findSoffice(): string | null {
  const onPath = spawnSync("which", ["soffice"]);
  if (onPath.status === 0) {
    const trimmed = String(onPath.stdout).trim();
    if (trimmed) return trimmed;
  }
  return SOFFICE_BINS.find((p) => fs.existsSync(p)) ?? null;
}

export function fileCategory(ext: string): FileCategory {
  const e = ext.toLowerCase();
  if (PRESENTATION_EXTS.has(e)) return "presentation";
  if (DOCUMENT_EXTS.has(e)) return "document";
  if (SPREADSHEET_EXTS.has(e)) return "spreadsheet";
  if (IMAGE_EXTS.has(e)) return "image";
  return "other";
}

export function detectBackends(): Backend[] {
  const found: Backend[] = [];

  for (const type of Object.keys(APP_CANDIDATES) as AppBackendType[]) {
    const app = findApp(APP_CANDIDATES[type]);
    if (app) found.push({ type, label: app.name, path: app.path, appName: app.name });
  }

  const sofficePath = findSoffice();
  if (sofficePath) {
    found.push({ type: "libreoffice", label: "LibreOffice", path: sofficePath });
  }

  // sips ships with every macOS install — converts an image to a single-page PDF sized to the image
  if (fs.existsSync("/usr/bin/sips")) {
    found.push({ type: "sips", label: "sips", path: "/usr/bin/sips" });
  }

  return found;
}

export function supportsExtension(type: BackendType, ext: string): boolean {
  return BACKEND_EXTS[type].has(ext.toLowerCase());
}

// All capable backends for a file, best first: explicit preference, then category priority,
// then anything else capable. Callers try them in order so a flaky native app falls back
// to the next engine (usually LibreOffice) instead of failing the file.
export function rankBackendsForFile(preferred: string, available: Backend[], ext: string): Backend[] {
  const capable = available.filter((b) => supportsExtension(b.type, ext));
  const ranked: Backend[] = [];
  const push = (b: Backend | undefined) => {
    if (b && !ranked.includes(b)) ranked.push(b);
  };
  if (preferred !== "auto") {
    push(capable.find((b) => b.type === preferred));
  }
  for (const type of EXT_PRIORITY[ext.toLowerCase()] ?? PRIORITY[fileCategory(ext)]) {
    push(capable.find((b) => b.type === type));
  }
  for (const b of capable) push(b);
  return ranked;
}

export function selectBackendForFile(preferred: string, available: Backend[], ext: string): Backend | null {
  return rankBackendsForFile(preferred, available, ext)[0] ?? null;
}

// AppleScript string literal. JSON.stringify is not safe here: it emits \b, \f, and \uXXXX
// escapes for control characters, which AppleScript does not understand.
function asString(s: string): string {
  return `"${s.replace(/[\\"]/g, "\\$&").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t")}"`;
}

function runAppleScript(script: string, tag: string, timeoutCleanup?: string): void {
  // Full script contains local file paths — keep it out of production logs.
  if (process.env.NODE_ENV === "development") console.log(`[slides2pdf:${tag}] script:\n${script}`);
  try {
    const stdout = execFileSync("osascript", ["-e", script], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 660000,
    });
    if (stdout.trim()) console.log(`[slides2pdf:${tag}] stdout:`, stdout.trim());
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message?: string; killed?: boolean };
    // A timeout kill skips the script's own close/quit cleanup — close the document from outside
    // so the file doesn't stay locked for fallback engines and retries.
    if (err.killed && timeoutCleanup) {
      spawnSync("osascript", ["-e", timeoutCleanup], { stdio: "ignore", timeout: 15000 });
    }
    console.error(`[slides2pdf:${tag}] stderr:`, err.stderr);
    throw new Error(err.stderr?.trim() || err.message || String(e));
  }
}

// Per-app AppleScript vocabulary. The plural collection and whose-filters derive from docClass;
// exportLine must reference theDoc and outFile. Excel's dictionary differs from Word's
// ("save workbook as … filename … file format PDF file format"); only Keynote supports
// PDF image quality.
interface AppScriptSpec {
  docClass: string;
  docExpr: string; // e.g. "front document", "active presentation" — fallback if no name matches
  exportLine: string;
}

const APP_SPECS: Record<AppBackendType, AppScriptSpec> = {
  keynote: {
    docClass: "document",
    docExpr: "front document",
    exportLine: "export theDoc to outFile as PDF with properties {PDF image quality:Best}",
  },
  pages: { docClass: "document", docExpr: "front document", exportLine: "export theDoc to outFile as PDF" },
  numbers: { docClass: "document", docExpr: "front document", exportLine: "export theDoc to outFile as PDF" },
  powerpoint: {
    docClass: "presentation",
    docExpr: "active presentation",
    exportLine: "save theDoc in outFile as save as PDF",
  },
  word: {
    docClass: "document",
    docExpr: "active document",
    exportLine: "save as theDoc file name outFile file format format PDF",
  },
  excel: {
    docClass: "workbook",
    docExpr: "active workbook",
    exportLine: "save workbook as theDoc filename outFile file format PDF file format",
  },
};

// Apps report the document name with or without extension depending on Finder settings.
function docNameMatch(src: string): string {
  return `name is ${asString(path.basename(src))} or name is ${asString(path.basename(src, path.extname(src)))}`;
}

// Shared AppleScript skeleton. All app scripts follow the same shape:
// remember whether the app was running, open the file, wait until the opened document appears and
// bind it by name (open is asynchronous for non-native formats like .pptx in Keynote, is a no-op
// for an already-open document, and apps may auto-create a blank startup document — a bare
// count-based wait mishandles all three), run the export inside try/on error so the error message
// is captured instead of swallowed, always close the document and quit the app if we launched it,
// then re-raise the captured error outside the tell block.
function conversionScript(appName: string, src: string, outputPath: string, spec: AppScriptSpec): string {
  const { docExpr, exportLine } = spec;
  const countExpr = `${spec.docClass}s`;
  return [
    `set wasRunning to (application "${appName}" is running)`,
    `set errMsg to ""`,
    `tell application "${appName}"`,
    `  try`,
    `    with timeout of 600 seconds`,
    `      set initialCount to (count of ${countExpr})`,
    `      open POSIX file ${asString(src)}`,
    `      set theDoc to missing value`,
    `      set tries to 0`,
    `      repeat while theDoc is missing value`,
    `        try`,
    `          set matched to (${countExpr} whose (${docNameMatch(src)}))`,
    `          if (count of matched) > 0 then set theDoc to item 1 of matched`,
    `        end try`,
    `        if theDoc is missing value and tries > 20 and (count of ${countExpr}) > initialCount then set theDoc to ${docExpr}`,
    `        if theDoc is missing value then`,
    `          delay 0.5`,
    `          set tries to tries + 1`,
    `          if tries > 120 then error "Timed out waiting for ${appName} to open the file"`,
    `        end if`,
    `      end repeat`,
    `      set outFile to POSIX file ${asString(outputPath)}`,
    `      ${exportLine}`,
    `      close theDoc saving no`,
    `    end timeout`,
    `  on error eMsg`,
    `    set errMsg to eMsg`,
    `    try`,
    `      close theDoc saving no`,
    `    end try`,
    `  end try`,
    `  try`,
    `    if not wasRunning then quit`,
    `  end try`,
    `end tell`,
    `if errMsg is not "" then error errMsg`,
  ].join("\n");
}

function closeDocScript(appName: string, docClass: string, src: string): string {
  return [
    `tell application "${appName}"`,
    `  try`,
    `    close (every ${docClass} whose ${docNameMatch(src)}) saving no`,
    `  end try`,
    `end tell`,
  ].join("\n");
}

// Exposed for syntax-checking the generated scripts without running a conversion.
export function buildAppleScriptForType(type: AppBackendType, appName: string, src: string, outputPath: string) {
  return conversionScript(appName, src, outputPath, APP_SPECS[type]);
}

// Microsoft Office apps are sandboxed: writing a PDF to an arbitrary folder (Desktop, Documents, …)
// via AppleScript silently fails or throws a permission error. Writing inside the app's own
// container always works, so we export there and move the result into place afterwards.
const OFFICE_CONTAINER_IDS: Partial<Record<BackendType, string>> = {
  powerpoint: "com.microsoft.Powerpoint",
  word: "com.microsoft.Word",
  excel: "com.microsoft.Excel",
};

function sandboxSafeOutputPath(type: BackendType): string | null {
  const id = OFFICE_CONTAINER_IDS[type];
  if (!id || !process.env.HOME) return null;
  const dataDir = path.join(process.env.HOME, "Library", "Containers", id, "Data");
  if (!fs.existsSync(dataDir)) return null;
  return path.join(dataDir, `slides2pdf-${process.pid}-${Date.now()}.pdf`);
}

function moveFile(from: string, to: string): void {
  try {
    fs.renameSync(from, to);
  } catch {
    fs.copyFileSync(from, to);
    fs.rmSync(from, { force: true });
  }
}

// Move an existing target PDF aside before every conversion so a failed run can restore it and a
// stale file can't pass the output check; AppleScript exports also error on existing files.
export function convertFile(backend: Backend, src: string, outputPath: string): void {
  const backupPath = `${outputPath}.slides2pdf-backup`;
  fs.rmSync(backupPath, { force: true });
  if (fs.existsSync(outputPath)) fs.renameSync(outputPath, backupPath);
  try {
    runBackend(backend, src, outputPath);
    if (!fs.existsSync(outputPath)) throw new Error("Conversion produced no output file");
    fs.rmSync(backupPath, { force: true });
  } catch (e) {
    if (fs.existsSync(backupPath) && !fs.existsSync(outputPath)) fs.renameSync(backupPath, outputPath);
    throw e;
  }
}

function runBackend(backend: Backend, src: string, outputPath: string): void {
  if (backend.type === "libreoffice") {
    // Isolated user profile: --convert-to silently produces nothing when another LibreOffice
    // instance (e.g. the GUI) holds the default profile lock. Converting into a temp outdir
    // lets the caller pick any output name (soffice always names the PDF after the source).
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "slides2pdf-lo-"));
    const outDir = path.join(workDir, "out");
    fs.mkdirSync(outDir);
    try {
      execFileSync(
        backend.path,
        [
          "--headless",
          `-env:UserInstallation=file://${path.join(workDir, "profile")}`,
          "--convert-to",
          "pdf",
          "--outdir",
          outDir,
          src,
        ],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 600000 },
      );
      const produced = path.join(outDir, `${path.basename(src, path.extname(src))}.pdf`);
      if (fs.existsSync(produced)) moveFile(produced, outputPath);
    } catch (e) {
      const err = e as { stderr?: string; message?: string };
      throw new Error(err.stderr?.toString().trim() || err.message || String(e));
    } finally {
      fs.rmSync(workDir, { recursive: true, force: true });
    }
    return;
  }

  if (backend.type === "sips") {
    execFileSync(backend.path, ["-s", "format", "pdf", src, "--out", outputPath], {
      stdio: "ignore",
      timeout: 600000,
    });
    return;
  }

  // Remaining types are AppleScript-driven; detectBackends always sets appName for them
  const type = backend.type as AppBackendType;
  const tmpOut = sandboxSafeOutputPath(type);
  const scriptOut = tmpOut ?? outputPath;
  try {
    runAppleScript(
      conversionScript(backend.appName!, src, scriptOut, APP_SPECS[type]),
      type,
      closeDocScript(backend.appName!, APP_SPECS[type].docClass, src),
    );
  } catch (e) {
    // Keep a PDF that was produced despite a late script error (e.g. quit failing).
    if (!fs.existsSync(scriptOut)) throw e;
  }
  if (tmpOut && fs.existsSync(tmpOut)) moveFile(tmpOut, outputPath);
}

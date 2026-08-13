import { execFile, spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";
import { PDFDocument } from "pdf-lib";
import { renderTextFilePdf } from "./textpdf";

const execFileAsync = promisify(execFile);

// execFile kills the child when piped output exceeds maxBuffer (default 1 MiB) — a chatty
// engine (sips warnings, soffice logs) must not abort an otherwise working conversion.
const MAX_OUTPUT_BUFFER = 16 * 1024 * 1024;

export type BackendType =
  | "keynote"
  | "powerpoint"
  | "pages"
  | "word"
  | "numbers"
  | "excel"
  | "libreoffice"
  | "sips"
  | "builtin";

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
const BACKEND_EXTS: Record<Exclude<BackendType, "builtin">, Set<string>> = {
  keynote: new Set([".key", ".pptx", ".ppt"]),
  powerpoint: new Set([".pptx", ".ppt", ".pps", ".ppsx", ".odp"]),
  pages: new Set([".pages", ".docx", ".doc", ".rtf", ".txt"]),
  // Word can't be driven for .txt: it imports plain text into an unsaved scratch document named
  // ~WRD0000 in its own Temp folder, so the file it opened cannot be identified and every
  // conversion stalls until the wait loop gives up. Other formats keep their real name and path.
  word: new Set([".docx", ".doc", ".odt", ".rtf"]),
  numbers: new Set([".numbers", ".xlsx", ".xls", ".csv"]),
  excel: new Set([".xlsx", ".xls", ".ods", ".csv"]),
  libreoffice: new Set(
    [...PRESENTATION_EXTS, ...DOCUMENT_EXTS, ...SPREADSHEET_EXTS, ...IMAGE_EXTS].filter(
      (e) => !APPLE_NATIVE_EXTS.has(e),
    ),
  ),
  sips: IMAGE_EXTS,
};

// The builtin text renderer (pdf-lib, bundled) claims every extension the richer engines don't:
// code, JSON, Markdown, logs, config files, … It renders raw file content as monospaced text, so
// any format some real engine understands is excluded even when that engine isn't installed — a
// garbled text dump of a .docx is worse than a clear "install LibreOffice" error. Derived from
// BACKEND_EXTS so a new engine capability can never fall through to a raw text dump. .pdf is
// excluded because the file already is one (convert-to-pdf.ts also skips it with a friendlier
// message). Text-based graphics are excluded too — a dump of SVG/PostScript source is not the
// image the user expects. Binary content is rejected at conversion time.
const TEXT_GRAPHIC_EXTS = [".svg", ".svgz", ".eps", ".ps", ".ai"];
const BUILTIN_EXCLUDED_EXTS = new Set([
  ...Object.values(BACKEND_EXTS).flatMap((s) => [...s]),
  ".pdf",
  ...TEXT_GRAPHIC_EXTS,
]);
const BUILTIN_TEXT_EXTS = new Set([".txt", ".csv"]); // plain-text formats it can also serve as last resort

// Priority order per file category (fallback when no per-extension order applies)
const PRIORITY: Record<FileCategory, BackendType[]> = {
  presentation: ["powerpoint", "keynote", "libreoffice"],
  document: ["word", "pages", "libreoffice"],
  spreadsheet: ["excel", "numbers", "libreoffice"],
  image: ["sips", "libreoffice"],
  other: ["builtin"],
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
  // Plain text has no formatting to preserve, so the bundled renderer is both exact and instant —
  // no reason to launch a word processor for it.
  ".txt": ["builtin", "pages", "libreoffice"],
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

// Each backend lists every bundle name it might appear under, most specific first: the "Creator
// Studio" editions are separate App Store builds that live beside a plain install, so they are
// matched first and the plain name is the fallback.
export type AppBackendType = "keynote" | "powerpoint" | "pages" | "word" | "numbers" | "excel";
const APP_CANDIDATES: Record<AppBackendType, string[]> = {
  keynote: ["Keynote Creator Studio", "Keynote"],
  powerpoint: ["Microsoft PowerPoint Creator Studio", "Microsoft PowerPoint"],
  pages: ["Pages Creator Studio", "Pages"],
  word: ["Microsoft Word Creator Studio", "Microsoft Word"],
  numbers: ["Numbers Creator Studio", "Numbers"],
  excel: ["Microsoft Excel Creator Studio", "Microsoft Excel"],
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

  // Bundled pdf-lib text renderer — always available, pushed last so it stays the last resort
  // in rankBackendsForFile's catch-all pass.
  found.push({ type: "builtin", label: "Text Renderer", path: "builtin" });

  return found;
}

function supportsExtension(type: BackendType, ext: string): boolean {
  const e = ext.toLowerCase();
  if (type === "builtin") return BUILTIN_TEXT_EXTS.has(e) || !BUILTIN_EXCLUDED_EXTS.has(e);
  return BACKEND_EXTS[type].has(e);
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

async function runAppleScript(script: string, tag: string, timeoutCleanup?: string): Promise<void> {
  // Full script contains local file paths — keep it out of production logs.
  if (process.env.NODE_ENV === "development") console.log(`[slides2pdf:${tag}] script:\n${script}`);
  try {
    const { stdout } = await execFileAsync("osascript", ["-e", script], {
      encoding: "utf8",
      timeout: 660000,
      maxBuffer: MAX_OUTPUT_BUFFER,
    });
    if (stdout.trim()) console.log(`[slides2pdf:${tag}] stdout:`, stdout.trim());
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message?: string; killed?: boolean };
    // A timeout kill skips the script's own close/quit cleanup — close the document from outside
    // so the file doesn't stay locked for fallback engines and retries.
    if (err.killed && timeoutCleanup) {
      await execFileAsync("osascript", ["-e", timeoutCleanup], { timeout: 15000 }).catch(() => {});
    }
    console.error(`[slides2pdf:${tag}] stderr:`, err.stderr);
    throw new Error(err.stderr?.trim() || err.message || String(e));
  }
}

// Per-app AppleScript vocabulary. docClass names the document class and its plural collection;
// every other entry is a function of the document expression the script currently addresses.
// Excel's dictionary differs from Word's ("save workbook as … filename … file format PDF file
// format"); only Keynote supports PDF image quality.
interface AppScriptSpec {
  docClass: string;
  exportLine: (doc: string) => string; // export statement for a document expression, writing to outFile
  unmodified: (doc: string) => string; // predicate excluding documents with unsaved edits (iWork: modified, MS: saved)
  pathExpr: (doc: string) => string; // expression yielding a document's on-disk path (errors when there is none)
  // Property identifying a document across the open call. It must be unique per document, or a
  // document that opens without a file of its own can be mistaken for one that was already there:
  // iWork has a real id, Office documents have none, so their full path stands in — plain `name`
  // is shared by two same-named files from different folders.
  docKey: string;
}

const APP_SPECS: Record<AppBackendType, AppScriptSpec> = {
  keynote: {
    docClass: "document",
    exportLine: (d) => `export ${d} to outFile as PDF with properties {PDF image quality:Best}`,
    unmodified: (d) => `modified of ${d} is false`,
    pathExpr: (doc) => `POSIX path of ((file of ${doc}) as alias)`,
    docKey: "id",
  },
  pages: {
    docClass: "document",
    exportLine: (d) => `export ${d} to outFile as PDF`,
    unmodified: (d) => `modified of ${d} is false`,
    pathExpr: (doc) => `POSIX path of ((file of ${doc}) as alias)`,
    docKey: "id",
  },
  numbers: {
    docClass: "document",
    exportLine: (d) => `export ${d} to outFile as PDF`,
    unmodified: (d) => `modified of ${d} is false`,
    pathExpr: (doc) => `POSIX path of ((file of ${doc}) as alias)`,
    docKey: "id",
  },
  powerpoint: {
    docClass: "presentation",
    exportLine: (d) => `save ${d} in outFile as save as PDF`,
    unmodified: (d) => `saved of ${d} is true`,
    pathExpr: (doc) => `full name of ${doc}`,
    docKey: "full name",
  },
  word: {
    docClass: "document",
    exportLine: (d) => `save as ${d} file name outFile file format format PDF`,
    unmodified: (d) => `saved of ${d} is true`,
    pathExpr: (doc) => `full name of ${doc}`,
    docKey: "full name",
  },
  excel: {
    docClass: "workbook",
    exportLine: (d) => `save workbook as ${d} filename outFile file format PDF file format`,
    unmodified: (d) => `saved of ${d} is true`,
    pathExpr: (doc) => `full name of ${doc}`,
    docKey: "full name",
  },
};

// Apps report the document name with or without extension depending on Finder settings.
// The unmodified predicate keeps a same-named document with unsaved edits from being bound —
// exporting it would produce the wrong PDF, and the close/cleanup would discard the user's
// edits via `saving no`. A freshly opened file is always unmodified/saved.
function docMatch(cand: string, src: string, spec: AppScriptSpec): string {
  const name = asString(path.basename(src));
  const stem = asString(path.basename(src, path.extname(src)));
  return `(name of ${cand} is ${name} or name of ${cand} is ${stem}) and ${spec.unmodified(cand)}`;
}

// AppleScript handler shared by both generated scripts. Returns the POSIX path of the document at
// the given index, "" when there is no file behind it (a freshly imported non-native format like
// .pptx in Keynote), or "?" while the app has not filled the property in yet — Word reports
// `missing value` for a document it has only just started opening, and that must not be mistaken
// for a pathless import.
//
// The handler takes an index, not a document: Word resolves a document reference passed out of a
// tell block by name, so with two same-named documents open it answers for the frontmost one and
// every path check silently compares the wrong document.
function docPathHandler(appName: string, spec: AppScriptSpec): string {
  return [
    `on docPath(i)`,
    `  tell application "${appName}"`,
    `    set p to missing value`,
    `    try`,
    `      set p to ${spec.pathExpr(`${spec.docClass} i`)}`,
    `    on error`,
    `      return ""`,
    `    end try`,
    `  end tell`,
    `  if p is missing value then return "?"`,
    `  if p does not start with "/" then set p to POSIX path of p`,
    `  return p`,
    `end docPath`,
  ].join("\n");
}

// Conversion script. `open` returns no handle on the document it opened, so the document has to be
// found afterwards: it is a name match (see docMatch) whose path is the source file, or — for a
// pathless import — one that did not exist before the open call.
//
// Every document is addressed by index and never held in a variable. Word resolves a stored
// document reference by name, so with two same-named documents open, `set d to document 2` and a
// later `export d`/`close d` act on the frontmost one instead: the wrong file gets exported and
// the wrong window closed. Word also rejects `repeat with d in (every document whose …)` outright.
//
// The wait loop covers open being
// asynchronous for non-native formats, a no-op for an already-open document, and apps that
// auto-create a blank startup document. The export runs inside try/on error so the message is
// captured instead of swallowed; the document is always closed, the app quits if we launched it,
// and the captured error is re-raised outside the tell block.
function conversionScript(appName: string, src: string, outputPath: string, spec: AppScriptSpec): string {
  const docs = `${spec.docClass}s`;
  const doc = (i: string) => `${spec.docClass} ${i}`;
  const isNew = `(${spec.docKey} of ${doc("i")}) is not in preKeys`;
  return [
    docPathHandler(appName, spec),
    `set wasRunning to (application "${appName}" is running)`,
    `set errMsg to ""`,
    `set docIndex to 0`,
    `tell application "${appName}"`,
    `  try`,
    `    with timeout of 600 seconds`,
    `      set initialCount to (count of ${docs})`,
    `      set preKeys to {}`,
    `      repeat with i from 1 to initialCount`,
    `        set end of preKeys to (${spec.docKey} of ${doc("i")})`,
    `      end repeat`,
    `      open POSIX file ${asString(src)}`,
    `      set tries to 0`,
    `      repeat while docIndex is 0`,
    `        try`,
    `          repeat with i from 1 to (count of ${docs})`,
    `            if ${docMatch(doc("i"), src, spec)} then`,
    `              set candPath to my docPath(i)`,
    `              if candPath is ${asString(src)} or (candPath is "" and ${isNew}) then`,
    `                set docIndex to i`,
    `                exit repeat`,
    `              end if`,
    `            end if`,
    `          end repeat`,
    `        end try`,
    // Last resort for an app that names the imported document unlike the file: something did
    // open, so accept a document that appeared after the open call and fits the source.
    `        if docIndex is 0 and tries > 20 and (count of ${docs}) > initialCount then`,
    `          try`,
    `            repeat with i from 1 to (count of ${docs})`,
    `              if ${isNew} then`,
    `                set candPath to my docPath(i)`,
    `                if candPath is ${asString(src)} or candPath is "" then`,
    `                  set docIndex to i`,
    `                  exit repeat`,
    `                end if`,
    `              end if`,
    `            end repeat`,
    `          end try`,
    `        end if`,
    `        if docIndex is 0 then`,
    `          delay 0.5`,
    `          set tries to tries + 1`,
    `          if tries > 120 then error "Timed out waiting for ${appName} to open the file"`,
    `        end if`,
    `      end repeat`,
    `      set outFile to POSIX file ${asString(outputPath)}`,
    `      ${spec.exportLine(doc("docIndex"))}`,
    `      close ${doc("docIndex")} saving no`,
    `    end timeout`,
    `  on error eMsg`,
    `    set errMsg to eMsg`,
    `    try`,
    `      if docIndex > 0 then close ${doc("docIndex")} saving no`,
    `    end try`,
    `  end try`,
    `  try`,
    `    if not wasRunning then quit`,
    `  end try`,
    `end tell`,
    `if errMsg is not "" then error errMsg`,
  ].join("\n");
}

// Timeout cleanup: the conversion process was killed before it could close anything, so the
// document is found again and closed — otherwise Office keeps a lock on the source file and the
// fallback engine fails too. This runs without the pre-open snapshot, so only an exact path match
// counts; a pathless import is left open rather than risking an unrelated document. At most one
// document can have the source's path, so the first match ends the loop.
function closeDocScript(appName: string, src: string, spec: AppScriptSpec): string {
  return [
    docPathHandler(appName, spec),
    `tell application "${appName}"`,
    `  try`,
    `    repeat with i from 1 to (count of ${spec.docClass}s)`,
    `      if ${docMatch(`${spec.docClass} i`, src, spec)} and my docPath(i) is ${asString(src)} then`,
    `        close ${spec.docClass} i saving no`,
    `        exit repeat`,
    `      end if`,
    `    end repeat`,
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

// Engines write to a per-process staging path that is moved into place only on success:
// outputPath is never partially written, never needs failure cleanup (a file someone else
// creates there concurrently stays untouched), and a stale file can't pass the output check.
// The staging name is fresh per run, so AppleScript's export-errors-on-existing-file rule
// can't fire either.
export async function convertFile(backend: Backend, src: string, outputPath: string): Promise<void> {
  if (fs.existsSync(outputPath)) throw new Error(`Output already exists: ${path.basename(outputPath)}`);
  const staging = `${outputPath}.converting-${process.pid}.pdf`;
  fs.rmSync(staging, { force: true });
  try {
    await runBackend(backend, src, staging);
    if (!fs.existsSync(staging)) throw new Error("Conversion produced no output file");
    publishFile(staging, outputPath);
  } finally {
    fs.rmSync(staging, { force: true });
  }
}

// Never replace a file that appeared at outputPath while the engine was running (rename would
// silently clobber it): link() and an exclusive copy both fail with EEXIST instead. Staging lives
// next to the output, so cross-device is impossible; the copy only covers filesystems without
// hard links. convertFile removes the staging file either way.
function publishFile(staging: string, outputPath: string): void {
  try {
    try {
      fs.linkSync(staging, outputPath);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "EEXIST") throw e;
      fs.copyFileSync(staging, outputPath, fs.constants.COPYFILE_EXCL);
    }
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    throw new Error(`Output already exists: ${path.basename(outputPath)}`);
  }
}

// Whether a file left behind by a failed export is a usable PDF. Parsing it is the only honest
// check: a %%EOF trailer says nothing about the body, and an export that died halfway can leave a
// file that still ends in one. Encrypted output counts as usable — it opens fine in a reader, so
// discarding it would lose a good conversion. Only reached on the error path, so the parse costs
// nothing in the normal case.
async function isReadablePdf(p: string): Promise<boolean> {
  try {
    const doc = await PDFDocument.load(fs.readFileSync(p), { ignoreEncryption: true });
    return doc.getPageCount() > 0;
  } catch {
    return false;
  }
}

async function runBackend(backend: Backend, src: string, outputPath: string): Promise<void> {
  if (backend.type === "libreoffice") {
    // Isolated user profile: --convert-to silently produces nothing when another LibreOffice
    // instance (e.g. the GUI) holds the default profile lock. Converting into a temp outdir
    // lets the caller pick any output name (soffice always names the PDF after the source).
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "slides2pdf-lo-"));
    const outDir = path.join(workDir, "out");
    fs.mkdirSync(outDir);
    try {
      await execFileAsync(
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
        { encoding: "utf8", timeout: 600000, maxBuffer: MAX_OUTPUT_BUFFER },
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
    await execFileAsync(backend.path, ["-s", "format", "pdf", src, "--out", outputPath], {
      timeout: 600000,
      maxBuffer: MAX_OUTPUT_BUFFER,
    });
    return;
  }

  if (backend.type === "builtin") {
    await renderTextFilePdf(src, outputPath);
    return;
  }

  // Remaining types are AppleScript-driven; detectBackends always sets appName for them
  const type = backend.type as AppBackendType;
  const tmpOut = sandboxSafeOutputPath(type);
  const scriptOut = tmpOut ?? outputPath;
  try {
    try {
      await runAppleScript(
        conversionScript(backend.appName!, src, scriptOut, APP_SPECS[type]),
        type,
        closeDocScript(backend.appName!, src, APP_SPECS[type]),
      );
    } catch (e) {
      // Keep a PDF that was produced despite a late script error (the close failing after a good
      // export) — but only a readable one, so a half-written file falls through to the next engine.
      if (!(await isReadablePdf(scriptOut))) throw e;
    }
    if (tmpOut && fs.existsSync(tmpOut)) moveFile(tmpOut, outputPath);
  } finally {
    // A failed export can leave a partial file inside the app's container, where nothing else
    // would ever clean it up. moveFile already removed it on the success path.
    if (tmpOut) fs.rmSync(tmpOut, { force: true });
  }
}

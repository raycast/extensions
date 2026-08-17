import { execFile } from "child_process";
import { existsSync, readFileSync } from "fs";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { homedir, tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export const MM_TO_PT = 72 / 25.4;

/**
 * Illustrator stores the bleed as whole points and truncates anything finer, so
 * 3 mm (8.504 pt) would silently export as 8 pt — 2.82 mm, less bleed than asked
 * for. Rounding up keeps the error on the safe side for print.
 */
export function bleedMmToPt(mm: number): number {
  return Math.ceil(mm * MM_TO_PT);
}

const PDF_PRESET_DIRS = [
  join(homedir(), "Library/Application Support/Adobe/Adobe PDF/Settings"),
  "/Library/Application Support/Adobe/Adobe PDF/Settings",
];

/**
 * A preset saved with "Use Document Bleed Settings" makes Illustrator ignore the
 * bleed we pass and fall back to the document's own bleed. There is no scripting
 * property for that flag, so the preset file itself is the only way to spot it.
 */
export function presetUsesDocumentBleed(preset: string): boolean {
  if (!preset) {
    return false;
  }
  for (const dir of PDF_PRESET_DIRS) {
    const file = join(dir, `${preset}.joboptions`);
    if (existsSync(file)) {
      try {
        return /\/UseDocumentBleed\s+true/i.test(readFileSync(file, "latin1"));
      } catch {
        return false;
      }
    }
  }
  return false;
}

export type ConvertOptions = {
  input: string;
  output: string;
  /** Bleed on all four sides, in points. Use 0 for "no bleed". */
  bleedPt: number;
  /** Illustrator PDF preset name, brackets included. Empty string keeps Illustrator's current settings. */
  preset: string;
  /** Write one PDF per artboard instead of a single multi-page PDF. */
  multipleArtboards: boolean;
  timeoutMs: number;
};

export type ConvertResult = {
  /** Path Illustrator was told to write. With `multipleArtboards` it is the base name. */
  output: string;
  /** Milliseconds Illustrator spent on the file. */
  durationMs: number;
};

class IllustratorError extends Error {}

/**
 * Illustrator only talks ExtendScript, so every operation is a small script we
 * generate, hand to Illustrator over Apple events and read a JSON reply back from.
 */
async function runJsx<T>(jsx: string, timeoutMs: number, activate = false): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "ai-to-pdf-"));
  const jsxPath = join(dir, "script.jsx");
  const scptPath = join(dir, "driver.applescript");

  // AppleScript rather than JXA: it is the only bridge with a `with timeout`
  // block, and exporting a heavy print file easily outruns the 2 minute default.
  const driver = [
    `set jsxPath to ${appleScriptString(jsxPath)}`,
    `set src to read POSIX file jsxPath as «class utf8»`,
    // Opening a document pulls Illustrator forward by itself, so activating up
    // front only changes when that happens — but it means Illustrator is already
    // in front while it works, and any dialog it raises is visible immediately
    // rather than blocking behind another window.
    ...(activate ? [`tell application "Adobe Illustrator" to activate`] : []),
    `with timeout of ${Math.max(30, Math.ceil(timeoutMs / 1000))} seconds`,
    `  tell application "Adobe Illustrator" to do javascript src`,
    `end timeout`,
  ].join("\n");

  try {
    await writeFile(jsxPath, jsx, "utf8");
    await writeFile(scptPath, driver, "utf8");

    const { stdout } = await execFileAsync("osascript", [scptPath], {
      // Give osascript a little more rope than the Apple event itself, so a real
      // Illustrator timeout surfaces as our own error rather than a killed process.
      timeout: timeoutMs + 15_000,
      maxBuffer: 4 * 1024 * 1024,
    });

    const raw = stdout.trim();
    if (!raw) {
      throw new IllustratorError("Illustrator returned an empty response.");
    }

    let parsed: { ok: boolean; error?: string } & T;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new IllustratorError(`Could not read Illustrator's response: ${raw.slice(0, 300)}`);
    }
    if (!parsed.ok) {
      throw new IllustratorError(parsed.error || "Illustrator reported an unknown error.");
    }
    return parsed;
  } catch (error) {
    throw new IllustratorError(describe(error));
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

function describe(error: unknown): string {
  if (error instanceof IllustratorError) {
    return error.message;
  }
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("-1743") || message.toLowerCase().includes("not authorized")) {
    return "Raycast is not allowed to control Illustrator. Allow it under System Settings › Privacy & Security › Automation.";
  }
  if (message.includes("-1728") || message.includes("-600") || message.includes("Application isn’t running")) {
    return "Illustrator could not be reached. Start Illustrator and try again.";
  }
  if (message.includes("-1712") || message.toLowerCase().includes("timed out")) {
    return "Illustrator did not respond in time. The file may be very large, or a dialog is waiting for input in Illustrator.";
  }
  return message.replace(/^Command failed:[^\n]*\n?/, "").trim() || "Unknown error.";
}

function appleScriptString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** ExtendScript predates JSON, so the reply is assembled by hand. */
const JSX_PRELUDE = `
function q(s) {
  s = String(s);
  var out = "";
  for (var i = 0; i < s.length; i++) {
    var c = s.charAt(i), code = s.charCodeAt(i);
    if (c === '"' || c === "\\\\") out += "\\\\" + c;
    else if (code < 32) out += " ";
    else out += c;
  }
  return '"' + out + '"';
}
`;

export async function listPdfPresets(timeoutMs = 30_000): Promise<string[]> {
  const jsx = `${JSX_PRELUDE}
var names = [];
try { names = app.PDFPresetsList; } catch (e) { names = []; }
var parts = [];
for (var i = 0; i < names.length; i++) { parts.push(q(names[i])); }
'{"ok":true,"presets":[' + parts.join(",") + ']}';
`;
  const result = await runJsx<{ presets: string[] }>(jsx, timeoutMs);
  return result.presets ?? [];
}

export async function convertFile(options: ConvertOptions): Promise<ConvertResult> {
  const started = Date.now();
  const params = {
    input: options.input,
    output: options.output,
    bleed: options.bleedPt,
    preset: options.preset,
    multipleArtboards: options.multipleArtboards,
  };

  const jsx = `${JSX_PRELUDE}
var P = ${JSON.stringify(params)};
var doc = null, wasOpen = false, reopenPath = null, error = null;

try {
  var source = new File(P.input);
  if (!source.exists) throw new Error("File not found: " + P.input);

  // Reuse the document if it is already open, so the same .ai is never loaded twice.
  for (var i = 0; i < app.documents.length; i++) {
    var candidate = app.documents[i], candidatePath = null;
    try { candidatePath = candidate.fullName.fsName; } catch (e) { candidatePath = null; }
    if (candidatePath && candidatePath === source.fsName) { doc = candidate; wasOpen = true; break; }
  }

  if (doc) {
    if (!doc.saved) {
      throw new Error("This file is open in Illustrator with unsaved changes. Save it first, then convert.");
    }
    reopenPath = source.fsName;
    app.activeDocument = doc;
  } else {
    doc = app.open(source);
  }

  var opts = new PDFSaveOptions();
  if (P.preset) {
    try { opts.pDFPreset = P.preset; }
    catch (e) { throw new Error("PDF preset not found in Illustrator: " + P.preset); }
  }
  opts.viewAfterSaving = false;
  opts.bleedLink = true;
  opts.bleedOffsetRect = [P.bleed, P.bleed, P.bleed, P.bleed];
  // Printer's marks are never wanted here, and a preset may well switch them on,
  // so every mark is forced off after the preset has been applied.
  opts.trimMarks = false;
  opts.registrationMarks = false;
  opts.colorBars = false;
  opts.pageInformation = false;
  opts.offset = 0;
  opts.saveMultipleArtboards = P.multipleArtboards;

  // saveAs rebinds the open document to the PDF, so the original .ai on disk is
  // left untouched and we close without saving afterwards.
  doc.saveAs(new File(P.output), opts);
  doc.close(SaveOptions.DONOTSAVECHANGES);
  doc = null;

  if (wasOpen && reopenPath) { app.open(new File(reopenPath)); }
} catch (e) {
  error = (e && e.message) ? e.message : String(e);
  // Only clean up documents we opened ourselves; one the user already had open stays open.
  if (doc && !wasOpen) {
    try { doc.close(SaveOptions.DONOTSAVECHANGES); } catch (e2) {}
  }
}

error === null ? '{"ok":true}' : '{"ok":false,"error":' + q(error) + '}';
`;

  await runJsx(jsx, options.timeoutMs, true);
  return { output: options.output, durationMs: Date.now() - started };
}

/**
 * True when Illustrator already has a process. Used to avoid cold-launching it
 * just to populate a dropdown.
 */
export async function isIllustratorRunning(): Promise<boolean> {
  try {
    await execFileAsync("pgrep", ["-f", "Adobe Illustrator.app/Contents/MacOS/Adobe Illustrator"]);
    return true;
  } catch {
    return false;
  }
}

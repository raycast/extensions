import { execFile } from "child_process";
import { existsSync, statSync } from "fs";
import { homedir } from "os";
import { basename, dirname, extname, join } from "path";
import { promisify } from "util";

const PDFTOTEXT_CANDIDATES = ["/opt/homebrew/bin/pdftotext", "/usr/local/bin/pdftotext"];

function findPdftotext(): string | null {
  for (const p of PDFTOTEXT_CANDIDATES) {
    if (existsSync(p)) return p;
  }
  return null;
}

export interface Preferences {
  markitdownPath: string;
  outputLocation: "sibling" | "downloads" | "custom";
  customOutputFolder: string;
  openAfterConvert: boolean;
  copyToClipboard: boolean;
}

const execFileAsync = promisify(execFile);

const DEFAULT_CANDIDATES = [
  `${homedir()}/.local/bin/markitdown`,
  "/opt/homebrew/bin/markitdown",
  "/usr/local/bin/markitdown",
];

export function resolveBinaryPath(preferences: Preferences): string {
  const configured = preferences.markitdownPath?.trim();
  if (configured) return configured;
  for (const candidate of DEFAULT_CANDIDATES) {
    if (existsSync(candidate)) return candidate;
  }
  return "markitdown";
}

export function resolveOutputPath(sourcePath: string, preferences: Preferences): string {
  const outName = basename(sourcePath).replace(/\.[^.]+$/, "") + ".md";
  switch (preferences.outputLocation) {
    case "downloads":
      return join(`${homedir()}/Downloads`, outName);
    case "custom":
      return join(preferences.customOutputFolder?.trim() || `${homedir()}/Downloads`, outName);
    case "sibling":
    default:
      return join(dirname(sourcePath), outName);
  }
}

export function expandHome(path: string): string {
  if (path.startsWith("~/")) return join(homedir(), path.slice(2));
  if (path === "~") return homedir();
  return path;
}

export function isReadableFile(path: string): boolean {
  try {
    return existsSync(path) && statSync(path).isFile();
  } catch {
    return false;
  }
}

export function isNonEmptyFile(path: string): boolean {
  try {
    return existsSync(path) && statSync(path).size > 0;
  } catch {
    return false;
  }
}

export interface ConvertResult {
  source: string;
  output: string;
  ok: boolean;
  error?: string;
}

export async function runMarkitdown(source: string, output: string, binary: string): Promise<ConvertResult> {
  const execEnv = {
    ...process.env,
    PATH: `${homedir()}/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin`,
  };

  // For PDFs, prefer pdftotext -layout: it preserves multi-column layouts (CVs,
  // two-column papers, slides) where markitdown's pdfminer backend linearises
  // text positionally and reorders right-aligned dates/locations. Fall back to
  // markitdown if pdftotext isn't installed or fails.
  if (extname(source).toLowerCase() === ".pdf") {
    const pdftotext = findPdftotext();
    if (pdftotext) {
      try {
        await execFileAsync(pdftotext, ["-layout", "-nopgbrk", source, output], {
          env: execEnv,
          maxBuffer: 64 * 1024 * 1024,
          timeout: 5 * 60 * 1000,
        });
        if (isNonEmptyFile(output)) {
          return { source, output, ok: true };
        }
      } catch {
        // fall through to markitdown
      }
    }
  }

  try {
    await execFileAsync(binary, [source, "-o", output], {
      env: execEnv,
      maxBuffer: 64 * 1024 * 1024,
      timeout: 5 * 60 * 1000,
    });
    if (!isNonEmptyFile(output)) {
      return { source, output, ok: false, error: "Empty output" };
    }
    return { source, output, ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { source, output, ok: false, error: message };
  }
}

export function binaryExistsOrOnPath(binary: string): boolean {
  if (binary.startsWith("/")) return existsSync(binary);
  return true; // bare command name — trust PATH, execFile will error if missing
}

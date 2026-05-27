import { existsSync } from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import { hasFinderPermission } from "../../utils/finder";

const execFileAsync = promisify(execFile);

const ENV = { ...process.env, PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin" };

export const getAugePath = () => {
  const candidates = ["/opt/homebrew/bin/auge", "/usr/local/bin/auge", "/usr/bin/auge"];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  throw new Error("auge binary not found.");
};

function isAugeInstalled() {
  try {
    getAugePath();
    return true;
  } catch {
    return false;
  }
}

export async function checkAuge(
  checkForFileSystemPermission = false,
): Promise<"not_installed" | "finder_permission_denied" | "ready"> {
  if (!isAugeInstalled()) return "not_installed";
  if (checkForFileSystemPermission && !(await hasFinderPermission())) return "finder_permission_denied";
  return "ready";
}

type Source = { type: "file"; path: string } | { type: "clipboard" };

async function runAuge(mode: "--ocr" | "--barcode", source: Source): Promise<string> {
  const augePath = getAugePath();
  const args = source.type === "file" ? [mode, "--quiet", source.path] : [mode, "--quiet", "--clipboard"];
  try {
    const { stdout } = await execFileAsync(augePath, args, { env: ENV });
    return stdout.trim();
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    if (raw.includes("[clipboard empty]")) {
      throw new Error("Clipboard does not contain an image. Copy a PNG, JPEG, HEIC, or TIFF first.");
    }
    throw err;
  }
}

export const runAugeOcr = (source: Source) => runAuge("--ocr", source);

export const runAugeBarcode = async (source: Source) => {
  const raw = await runAuge("--barcode", source);
  // auge prefixes each barcode result with its type, e.g. "[QR] https://…" — strip it
  return raw
    .split("\n")
    .map((line) => line.replace(/^\[.*?\]\s*/, ""))
    .join("\n")
    .trim();
};

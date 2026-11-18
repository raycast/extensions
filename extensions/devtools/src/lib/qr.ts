import { environment } from "@raycast/api";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import QRCode from "qrcode";

const runFile = promisify(execFile);

export async function generateQr(url: string): Promise<string> {
  const directory = path.join(environment.supportPath, "qr-codes");
  await mkdir(directory, { recursive: true });
  const filename = `${createHash("sha256").update(url).digest("hex")}.png`;
  const target = path.join(directory, filename);
  await QRCode.toFile(target, url, { width: 512, margin: 4, errorCorrectionLevel: "M" });
  return target;
}

export async function decodeClipboardQr(): Promise<string[]> {
  const helper = path.join(environment.assetsPath, "qr-helper");
  try {
    await access(helper);
  } catch {
    throw new Error("The QR helper has not been built. Run npm run build:native in the project directory.");
  }
  try {
    const { stdout } = await runFile(helper, ["decode-clipboard"], { timeout: 15_000, maxBuffer: 1024 * 1024 });
    const result = JSON.parse(stdout) as { codes: string[] };
    return result.codes;
  } catch (cause) {
    const error = cause as Error & { stderr?: string; killed?: boolean };
    if (error.killed) throw new Error("QR decoding timed out. Try a smaller image.");
    throw new Error(error.stderr?.trim() || error.message || "QR decoding failed.");
  }
}

import { environment } from "@raycast/api";
import { createHash } from "node:crypto";
import { access, copyFile, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { qrCodePNG } from "./png";
import { encodeQR } from "./qrcode";

/** QR images not shown for this long are removed. The longest temporary link lasts 7 days. */
const KEEP_FOR = 7 * 24 * 60 * 60 * 1000;

/**
 * Writes the QR code for `link` as a PNG in the extension's support folder
 * and returns its path. The name comes from the link, so showing the same
 * link again reuses the file. Images not shown for a week are removed on the
 * way, since every temporary link gets its own and they'd otherwise pile up;
 * a QR code is simply written again when it's shown again.
 */
export async function writeQRCode(link: string): Promise<string> {
  const folder = path.join(environment.supportPath, "qr-codes");
  await mkdir(folder, { recursive: true });
  // Encoded first, so a link too long for a QR code doesn't leave anything behind.
  const png = qrCodePNG(encodeQR(link));
  const file = path.join(folder, `${createHash("sha256").update(link).digest("hex").slice(0, 32)}.png`);
  await writeFile(file, png);
  await removeOldQRCodes(folder);
  return file;
}

async function removeOldQRCodes(folder: string) {
  const cutoff = Date.now() - KEEP_FOR;
  for (const name of await readdir(folder).catch(() => [])) {
    const file = path.join(folder, name);
    try {
      if ((await stat(file)).mtimeMs < cutoff) await rm(file, { force: true });
    } catch {
      // Already gone, or not ours to remove; neither matters here.
    }
  }
}

/** Copies the PNG to ~/Downloads as "<name> QR Code.png", numbered instead of overwriting. */
export async function saveQRCode(file: string, name: string): Promise<string> {
  const folder = path.join(homedir(), "Downloads");
  const base = `${safeName(name) || "Aktar"} QR Code`;
  for (let attempt = 1; ; attempt++) {
    const target = path.join(folder, attempt === 1 ? `${base}.png` : `${base} ${attempt}.png`);
    try {
      await access(target);
    } catch {
      await copyFile(file, target);
      return target;
    }
  }
}

function safeName(name: string) {
  return name
    .replace(/[/\\:]/g, "-")
    .replace(/\.[^.]+$/, "")
    .trim();
}

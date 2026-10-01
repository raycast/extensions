import { environment } from "@raycast/api";
import { createHash } from "node:crypto";
import { access, copyFile, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { qrCodePNG } from "./png";
import { encodeQR } from "./qrcode";

/**
 * Writes the QR code for `link` as a PNG in the extension's support folder
 * and returns its path. The name comes from the link, so showing the same
 * link again reuses the file. A temporary link (`expiresAt`) also has its
 * expiry in the name, so its image is removed once the link is dead, since
 * every temporary link gets its own image and they'd otherwise pile up.
 * Images of links that still work are never removed, so an open QR view
 * keeps its image.
 */
export async function writeQRCode(link: string, expiresAt?: string): Promise<string> {
  const folder = path.join(environment.supportPath, "qr-codes");
  await mkdir(folder, { recursive: true });
  // Encoded first, so a link too long for a QR code doesn't leave anything behind.
  const png = qrCodePNG(encodeQR(link));
  const hash = createHash("sha256").update(link).digest("hex").slice(0, 32);
  const expiry = expiresAt ? new Date(expiresAt).getTime() : NaN;
  const file = path.join(folder, Number.isFinite(expiry) ? `${hash}-${expiry}.png` : `${hash}.png`);
  await writeFile(file, png);
  await removeExpiredQRCodes(folder);
  return file;
}

/** Writes the image again when it's gone, e.g. removed while the view was open. */
export async function ensureQRCode(file: string, link: string, expiresAt?: string): Promise<string> {
  try {
    await access(file);
    return file;
  } catch {
    return writeQRCode(link, expiresAt);
  }
}

/** Removes the images of temporary links that have expired. */
async function removeExpiredQRCodes(folder: string) {
  const now = Date.now();
  for (const name of await readdir(folder).catch(() => [])) {
    const expiry = Number(/-(\d+)\.png$/.exec(name)?.[1]);
    if (expiry < now) await rm(path.join(folder, name), { force: true }).catch(() => undefined);
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

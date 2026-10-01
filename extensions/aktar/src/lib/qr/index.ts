import { environment } from "@raycast/api";
import { createHash } from "node:crypto";
import { access, copyFile, mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { qrCodePNG } from "./png";
import { encodeQR } from "./qrcode";

/**
 * Writes the QR code for `link` as a PNG in the extension's support folder
 * and returns its path. The name comes from the link, so showing the same
 * link again reuses the file.
 */
export async function writeQRCode(link: string): Promise<string> {
  const folder = path.join(environment.supportPath, "qr-codes");
  await mkdir(folder, { recursive: true });
  const file = path.join(folder, `${createHash("sha256").update(link).digest("hex").slice(0, 32)}.png`);
  await writeFile(file, qrCodePNG(encodeQR(link)));
  return file;
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

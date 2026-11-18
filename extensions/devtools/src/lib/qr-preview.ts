import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { codeBlock } from "./markdown";

const QR_PREVIEW_SIZE = 280;

export function qrImageDataUrl(png: Buffer): string {
  return `data:image/png;base64,${png.toString("base64")}`;
}

export async function qrTemporaryFile(png: Buffer): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "raycast-devtools-qr-"));
  const file = path.join(directory, "qrcode.png");
  await writeFile(file, png);
  return file;
}

export function qrPreviewMarkdown(imageDataUrl: string, url: string): string {
  return `![QR code](${imageDataUrl}?raycast-width=${QR_PREVIEW_SIZE}&raycast-height=${QR_PREVIEW_SIZE})\n\n${codeBlock(url)}`;
}

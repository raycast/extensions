import { readFile } from "node:fs/promises";
import { codeBlock } from "./markdown";

const QR_PREVIEW_SIZE = 280;

export async function qrImageDataUrl(imagePath: string): Promise<string> {
  const png = await readFile(imagePath);
  return `data:image/png;base64,${png.toString("base64")}`;
}

export function qrPreviewMarkdown(imageDataUrl: string, url: string): string {
  return `![QR code](${imageDataUrl}?raycast-width=${QR_PREVIEW_SIZE}&raycast-height=${QR_PREVIEW_SIZE})\n\n${codeBlock(url)}`;
}

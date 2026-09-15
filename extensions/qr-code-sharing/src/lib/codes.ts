import { getPreferenceValues } from "@raycast/api";
import bwipjs from "bwip-js/node";
import QRCode from "qrcode";
import { getFormat } from "./formats";

/** Always render black on white so the code stays scannable in dark mode. */
const QR_OPTIONS = {
  margin: 2,
  errorCorrectionLevel: "M" as const,
  color: { dark: "#000000ff", light: "#ffffffff" },
};

/** Rendered once at this scale to measure the natural size, then scaled to fit the box. */
const BASE_SCALE = 4;

export interface Box {
  width: number;
  height: number;
}

type QRSize = "small" | "medium" | "large";

/**
 * Raycast sizes its own window and offers no API to resize it, and the `raycast-height`
 * markdown parameter is ignored for `data:` URIs — the image is drawn at its natural size
 * (1 pixel per point) and only shrunk to fit the container's width, never its height.
 * So the image itself has to be generated at the size it should appear at.
 *
 * Measured at Raycast's default window size: the content area runs from 80pt below the top
 * to roughly 420pt. `preview` is the narrower pane next to the list; `detail` is full width.
 */
const BOXES: Record<QRSize, { detail: Box; preview: Box }> = {
  small: { detail: { width: 520, height: 240 }, preview: { width: 340, height: 220 } },
  medium: { detail: { width: 620, height: 320 }, preview: { width: 400, height: 290 } },
  large: { detail: { width: 700, height: 360 }, preview: { width: 430, height: 330 } },
};

export function codeBoxes(): { detail: Box; preview: Box } {
  const { qrSize } = getPreferenceValues<{ qrSize?: QRSize }>();
  return BOXES[qrSize ?? "medium"];
}

export interface RenderResult {
  dataURL?: string;
  /** Set when the content cannot be expressed in the chosen symbology. */
  error?: string;
}

/** `bwipp.ean13badCharacter#6882: EAN-13 must contain only digits` → the readable half. */
function readableError(error: unknown): string {
  return String(error instanceof Error ? error.message : error).replace(/^(bwipp\.\w+#\d+:\s*)/, "");
}

function pngSize(buffer: Buffer): Box {
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function bwipOptions(content: string, bcid: string, showsText: boolean) {
  return {
    bcid,
    text: content,
    includetext: showsText,
    textxalign: "center" as const,
    backgroundcolor: "ffffff",
    paddingwidth: 6,
    paddingheight: 6,
  };
}

/** Draws `content` as `formatId`, sized to fill `box` without overflowing it. */
export async function renderCode(content: string, formatId: string, box: Box): Promise<RenderResult> {
  const format = getFormat(formatId);
  try {
    if (format.id === "qr") {
      // The QR encoder takes an exact pixel width, so no measuring round trip is needed.
      return { dataURL: await QRCode.toDataURL(content, { ...QR_OPTIONS, width: box.height }) };
    }
    const options = bwipOptions(content, format.bcid, format.showsText);
    const measured = await bwipjs.toBuffer({ ...options, scale: BASE_SCALE });
    const natural = pngSize(measured);
    const factor = Math.min(box.width / natural.width, box.height / natural.height);
    const scale = Math.min(Math.max(BASE_SCALE * factor, 1), 12);
    const buffer = Math.abs(scale - BASE_SCALE) < 0.05 ? measured : await bwipjs.toBuffer({ ...options, scale });
    return { dataURL: `data:image/png;base64,${buffer.toString("base64")}` };
  } catch (error) {
    return { error: readableError(error) };
  }
}

/** Full-resolution PNG on disk, for copying and saving. Throws if the content does not fit the format. */
export async function writeCodeFile(content: string, formatId: string, filePath: string): Promise<string> {
  const format = getFormat(formatId);
  if (format.id === "qr") {
    await QRCode.toFile(filePath, content, { ...QR_OPTIONS, width: 1024 });
    return filePath;
  }
  const buffer = await bwipjs.toBuffer({ ...bwipOptions(content, format.bcid, format.showsText), scale: 8 });
  const { writeFile } = await import("fs/promises");
  await writeFile(filePath, buffer);
  return filePath;
}

export function codeMarkdown(result: RenderResult | undefined): string {
  if (!result) return "";
  if (result.error) return `## ⚠️ Cannot encode\n\n${result.error}`;
  return result.dataURL ? `![Code](${result.dataURL})` : "";
}

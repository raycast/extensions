// Copying and saving a code as PNG or SVG, the same way in every view. Each
// export draws the code with its logo loaded (qr-engine withLogoData) and
// says so when it fails.

import { writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { buildPNGBuffer, buildSVGString, type QRRenderProps, withLogoData } from "./qr-engine";

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function svgFile(svg: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n${svg}`;
}

/** A file name in Downloads or the temporary folder: `prefix`, then the time. */
function fileName(prefix: string, extension: "png" | "svg"): string {
  return `${prefix}-${Date.now()}.${extension}`;
}

export async function copyPNG(props: QRRenderProps, prefix = "qrdx") {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Generating PNG…" });
  try {
    const buf = buildPNGBuffer(await withLogoData(props));
    const tmpPath = join(tmpdir(), fileName(prefix, "png"));
    writeFileSync(tmpPath, buf);
    await Clipboard.copy({ file: tmpPath } as Parameters<typeof Clipboard.copy>[0]);
    toast.style = Toast.Style.Success;
    toast.title = "PNG copied to clipboard";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to copy PNG";
    toast.message = errorText(error);
  }
}

export async function copySVG(props: QRRenderProps) {
  try {
    await Clipboard.copy(buildSVGString(await withLogoData(props)));
    await showHUD("SVG copied to clipboard");
  } catch (error) {
    await showFailureToast(error, { title: "Failed to copy SVG" });
  }
}

export async function savePNG(props: QRRenderProps, prefix = "qrdx") {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Saving PNG…" });
  try {
    const buf = buildPNGBuffer(await withLogoData(props));
    const outPath = join(homedir(), "Downloads", fileName(prefix, "png"));
    writeFileSync(outPath, buf);
    toast.style = Toast.Style.Success;
    toast.title = "PNG saved";
    toast.message = outPath;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to save PNG";
    toast.message = errorText(error);
  }
}

export async function saveSVG(props: QRRenderProps, prefix = "qrdx") {
  try {
    const outPath = join(homedir(), "Downloads", fileName(prefix, "svg"));
    writeFileSync(outPath, svgFile(buildSVGString(await withLogoData(props))), "utf-8");
    await showHUD(`SVG saved → ${outPath}`);
  } catch (error) {
    await showFailureToast(error, { title: "Failed to save SVG" });
  }
}

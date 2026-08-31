/**
 * クリップボードへのコピーとファイル保存。
 */

import { Clipboard, environment, getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Barcode } from "./barcode.ts";
import { fileBaseName } from "./filename.ts";
import { renderPng } from "./png.ts";
import { renderSvg } from "./svg.ts";

/** 設定された PNG 倍率（1モジュールあたりのピクセル数） */
export function getPngScale(): number {
  const { pngScale } = getPreferenceValues<Preferences>();
  const parsed = Number(pngScale);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 4;
}

/** PNG をクリップボードにコピーする（画像として貼り付けられる） */
export async function copyPngToClipboard(barcode: Barcode): Promise<void> {
  try {
    // Clipboard はファイルパスを受け取るため、いったんサポートディレクトリに書き出す
    const dir = join(environment.supportPath, "clipboard");
    mkdirSync(dir, { recursive: true });
    const filePath = join(dir, `${fileBaseName(barcode)}.png`);
    writeFileSync(filePath, renderPng(barcode, getPngScale()));

    await Clipboard.copy({ file: filePath });
    await showToast({ style: Toast.Style.Success, title: "Copied PNG", message: barcode.code });
  } catch (error) {
    await showFailureToast(error, { title: "Failed to Copy PNG" });
  }
}

/** SVG のソースをテキストとしてコピーする */
export async function copySvgSource(barcode: Barcode): Promise<void> {
  try {
    await Clipboard.copy(renderSvg(barcode));
    await showToast({ style: Toast.Style.Success, title: "Copied SVG", message: barcode.code });
  } catch (error) {
    await showFailureToast(error, { title: "Failed to Copy SVG" });
  }
}

/** PNG をファイルに保存する */
export async function savePng(barcode: Barcode): Promise<void> {
  await saveFile(barcode, "png", () => renderPng(barcode, getPngScale()));
}

/** SVG をファイルに保存する */
export async function saveSvg(barcode: Barcode): Promise<void> {
  await saveFile(barcode, "svg", () => Buffer.from(renderSvg(barcode), "utf8"));
}

async function saveFile(barcode: Barcode, extension: string, render: () => Buffer): Promise<void> {
  try {
    const dir = getSaveDirectory();
    mkdirSync(dir, { recursive: true });

    const filePath = uniquePath(dir, fileBaseName(barcode), extension);
    writeFileSync(filePath, render());

    await showToast({
      style: Toast.Style.Success,
      title: `Saved ${extension.toUpperCase()}`,
      message: filePath,
      primaryAction: {
        title: "Open File",
        onAction: () => {
          open(filePath);
        },
      },
      secondaryAction: {
        title: "Open Folder",
        onAction: () => {
          open(dir);
        },
      },
    });
  } catch (error) {
    await showFailureToast(error, { title: `Failed to Save ${extension.toUpperCase()}` });
  }
}

function getSaveDirectory(): string {
  const { savePath } = getPreferenceValues<Preferences>();
  return savePath && savePath.trim().length > 0 ? savePath : join(homedir(), "Downloads");
}

/** 同名ファイルがある場合は連番を付けて上書きを避ける */
function uniquePath(dir: string, baseName: string, extension: string): string {
  const candidate = join(dir, `${baseName}.${extension}`);
  if (!existsSync(candidate)) {
    return candidate;
  }
  for (let i = 2; ; i++) {
    const next = join(dir, `${baseName}-${i}.${extension}`);
    if (!existsSync(next)) {
      return next;
    }
  }
}

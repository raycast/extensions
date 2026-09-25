/**
 * Detail ビューに表示するプレビュー画像の生成。
 *
 * Raycast の markdown 画像は等倍で描画されるため、そのままだと Detail の高さを
 * 超えて見切れてしまう。raycast-width / raycast-height で表示サイズを明示するために、
 * サポートディレクトリに書き出した PNG を file URL で参照している
 * （data URI にクエリを付けると base64 の一部と解釈されうるため避けている）。
 */

import { environment } from "@raycast/api";
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Barcode } from "./barcode.ts";
import { previewFileName } from "./filename.ts";
import { buildLayout } from "./layout.ts";
import { renderPng } from "./png.ts";

/** 表示は縮小するので、元画像は高解像度で作っておく */
const RENDER_SCALE = 8;

const PREVIEW_PREFIX = "preview-";

/**
 * 残しておくプレビューの数。
 * 一覧には複数のシンボロジーが同時に並ぶので、直近のぶんはまとめて残す必要がある。
 */
const MAX_PREVIEW_FILES = 20;

/**
 * Detail の markdown 本文を組み立てる。
 * `displayHeight` は表示したい高さ（ピクセル）。幅は縦横比から決まる。
 */
export function buildPreviewMarkdown(barcode: Barcode, displayHeight: number): string {
  const layout = buildLayout(barcode);
  const height = Math.round(displayHeight);
  const width = Math.round((layout.width / layout.height) * height);
  const url = writePreviewFile(barcode);

  return `![${altText(barcode)}](${url}?raycast-width=${width}&raycast-height=${height})`;
}

/** markdown の記法を壊さないよう、括弧類を落とした代替テキストにする */
function altText(barcode: Barcode): string {
  return `${barcode.label} ${barcode.code}`.replace(/[[\]()]/g, " ");
}

/**
 * サポートディレクトリに PNG を書き出して file URL を返す。
 * 内容が変わればファイル名も変わるので、Raycast 側のキャッシュとも衝突しない。
 */
function writePreviewFile(barcode: Barcode): string {
  const dir = join(environment.supportPath, "preview");
  mkdirSync(dir, { recursive: true });

  const filePath = join(dir, `${PREVIEW_PREFIX}${previewFileName(barcode)}.png`);
  if (!existsSync(filePath)) {
    writeFileSync(filePath, renderPng(barcode, RENDER_SCALE));
    cleanUpPreviews(dir, filePath);
  }
  return pathToFileURL(filePath).href;
}

/** 過去のプレビューが溜まらないよう、新しいものから一定数だけ残して消す */
function cleanUpPreviews(dir: string, keepPath: string): void {
  const files = readdirSync(dir)
    .filter((name) => name.startsWith(PREVIEW_PREFIX))
    .map((name) => {
      const path = join(dir, name);
      try {
        return { path, updatedAt: statSync(path).mtimeMs };
      } catch {
        return { path, updatedAt: 0 };
      }
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);

  for (const file of files.slice(MAX_PREVIEW_FILES)) {
    if (file.path === keepPath) {
      continue;
    }
    try {
      unlinkSync(file.path);
    } catch {
      // 使用中などで消せなくても支障はないので無視する
    }
  }
}

/**
 * ファイル名の組み立て。
 *
 * CODE39 / CODE128 / NW-7 のコードには / : * などファイル名に使えない文字が入りうるので、
 * 安全な文字だけに落としたうえで、別のコードと衝突しないよう短いハッシュを添える。
 */

import { createHash } from "node:crypto";
import type { Barcode } from "./barcode.ts";

/** ファイル名に残す最大の長さ */
const MAX_CODE_LENGTH = 32;

/** シンボロジーごとのファイル名の接頭辞 */
const PREFIXES: Record<Barcode["symbology"], string> = {
  ean13: "EAN13",
  itf: "ITF",
  nw7: "NW7",
  code39: "CODE39",
  code128: "CODE128",
};

/** 保存ファイル名（拡張子なし）。例: CODE128_ABC-123_1f4a2b3c */
export function fileBaseName(barcode: Barcode): string {
  const safe = sanitize(barcode.code);
  const parts = [PREFIXES[barcode.symbology], safe];

  // 記号を落とした結果として別のコードと同名になりうるので、元のコードのハッシュを足す
  if (safe !== barcode.code) {
    parts.push(shortHash(barcode.code));
  }
  return parts.filter((part) => part.length > 0).join("_");
}

/** プレビュー用の一時ファイル名（拡張子なし）。内容が変われば必ず変わる */
export function previewFileName(barcode: Barcode): string {
  return `${barcode.symbology}-${shortHash(barcode.code)}`;
}

function sanitize(code: string): string {
  return code
    .replace(/[^A-Za-z0-9._-]/g, "-")
    .replace(/-{2,}/g, "-")
    .slice(0, MAX_CODE_LENGTH);
}

function shortHash(value: string): string {
  return createHash("sha1").update(value).digest("hex").slice(0, 8);
}

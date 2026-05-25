import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Raycast Store が要求するスクリーンショット幅
 */
const REQUIRED_WIDTH = 2000;

/**
 * Raycast Store が要求するスクリーンショット高さ
 */
const REQUIRED_HEIGHT = 1250;

/**
 * スクリーンショットの最大枚数
 */
const MAX_SCREENSHOTS = 6;

/**
 * 推奨される最小スクリーンショット枚数
 */
const RECOMMENDED_MIN_SCREENSHOTS = 3;

/**
 * 公開画像に混入させない文字列
 */
const BLOCKED_TEXT_PATTERNS = [
  /kazuhideoki/i,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /github\.com\/kazuhideoki/i,
  /Users\/kazuhideoki/i,
];

/**
 * metadata ディレクトリ
 */
const METADATA_DIR = join(process.cwd(), "metadata");

/**
 * sips の出力から画像サイズを読む
 */
function readPngSize(filePath) {
  const output = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", filePath], {
    encoding: "utf8",
  });
  const width = Number(output.match(/pixelWidth:\s*(\d+)/)?.[1] ?? 0);
  const height = Number(output.match(/pixelHeight:\s*(\d+)/)?.[1] ?? 0);
  return { width, height };
}

/**
 * PNG の printable 文字列に明らかな機密文字列が含まれないか簡易検査する
 */
function assertNoBlockedText(filePath) {
  const content = execFileSync("strings", [filePath], {
    encoding: "utf8",
  });
  const matched = BLOCKED_TEXT_PATTERNS.find((pattern) => pattern.test(content));
  if (matched) {
    throw new Error(`Blocked text pattern was found in ${filePath}: ${matched}`);
  }
}

/**
 * metadata PNG を Raycast Store 仕様で検査する
 */
function main() {
  if (!existsSync(METADATA_DIR)) {
    throw new Error("metadata directory does not exist.");
  }
  const pngFiles = readdirSync(METADATA_DIR)
    .filter((name) => name.endsWith(".png"))
    .sort();
  if (pngFiles.length < RECOMMENDED_MIN_SCREENSHOTS) {
    throw new Error(`At least ${RECOMMENDED_MIN_SCREENSHOTS} PNG screenshots are recommended.`);
  }
  if (pngFiles.length > MAX_SCREENSHOTS) {
    throw new Error(`Raycast Store accepts at most ${MAX_SCREENSHOTS} screenshots.`);
  }
  for (const name of pngFiles) {
    const filePath = join(METADATA_DIR, name);
    const { width, height } = readPngSize(filePath);
    if (width !== REQUIRED_WIDTH || height !== REQUIRED_HEIGHT) {
      throw new Error(`${name} must be ${REQUIRED_WIDTH}x${REQUIRED_HEIGHT}, got ${width}x${height}.`);
    }
    assertNoBlockedText(filePath);
    console.log(`${name}: ${width}x${height}`);
  }
}

main();

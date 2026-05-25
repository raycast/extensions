import { Clipboard, getSelectedFinderItems } from "@raycast/api";
import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, lstatSync } from "node:fs";
import { mkdir, readFile, readdir, rm, stat } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { extname, join } from "node:path";
import { promisify } from "node:util";

const SUPPORTED_AUTO_START_IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".bmp",
  ".tif",
  ".tiff",
  ".heic",
  ".heif",
]);

/**
 * macOS スクリーンショット名として扱う接頭辞
 */
const SCREENSHOT_FILENAME_PREFIXES = ["Screenshot", "Screen Shot", "スクリーンショット"];

/**
 * Raycast Clipboard 履歴で参照する最大 offset
 */
const CLIPBOARD_HISTORY_MAX_OFFSET = 5;

type ImagePathResolutionRequest = {
  excludedImagePaths?: string[];
};

/**
 * node:child_process の Promise 版 execFile
 */
const execFileAsync = promisify(execFile);

/**
 * Auto Start の画像として扱う拡張子か判定する
 */
export function isSupportedAutoStartImagePath(path: string): boolean {
  return SUPPORTED_AUTO_START_IMAGE_EXTENSIONS.has(extname(path).toLowerCase());
}

/**
 * Auto Start に渡せるローカル画像ファイルか判定する
 */
export function isReadableAutoStartImagePath(path: string): boolean {
  try {
    return isSupportedAutoStartImagePath(path) && existsSync(path) && lstatSync(path).isFile();
  } catch {
    return false;
  }
}

/**
 * ファイル名が macOS のスクリーンショット名らしいか判定する
 */
export function isLikelyMacScreenshotFilename(filename: string): boolean {
  return SCREENSHOT_FILENAME_PREFIXES.some((prefix) => filename.startsWith(prefix));
}

/**
 * 候補ファイルから最終更新日時が最新のスクリーンショットを選ぶ
 */
export function selectLatestScreenshotPath(
  candidates: { path: string; filename: string; modifiedAtMs: number }[],
  options: { excludedImagePaths?: string[] } = {},
): string | null {
  const excludedImagePaths = new Set(options.excludedImagePaths ?? []);
  const sorted = candidates
    .filter(
      (candidate) =>
        !excludedImagePaths.has(candidate.path) &&
        isSupportedAutoStartImagePath(candidate.path) &&
        isLikelyMacScreenshotFilename(candidate.filename),
    )
    .sort((left, right) => right.modifiedAtMs - left.modifiedAtMs);
  return sorted[0]?.path ?? null;
}

/**
 * クリップボードから Auto Start に添付する画像パスを解決する
 */
export async function resolveClipboardImagePath(request: ImagePathResolutionRequest = {}): Promise<string | null> {
  const excludedImagePaths = new Set(request.excludedImagePaths ?? []);
  for (let offset = 0; offset <= CLIPBOARD_HISTORY_MAX_OFFSET; offset += 1) {
    let content: Clipboard.ReadContent;
    try {
      content = await Clipboard.read({ offset });
    } catch {
      continue;
    }

    const path = resolveClipboardContentImagePath({ content, excludedImagePaths });
    if (path) {
      return path;
    }

    if (offset === 0) {
      const nativeImagePath = await extractNativeClipboardImage({ excludedImagePaths });
      if (nativeImagePath) {
        return nativeImagePath;
      }
    }
  }
  return null;
}

/**
 * macOS のスクリーンショット保存先から最新画像パスを解決する
 */
export async function resolveLatestScreenshotImagePath(
  request: ImagePathResolutionRequest = {},
): Promise<string | null> {
  const screenshotDir = await resolveMacScreenshotDirectory();
  let entries: Awaited<ReturnType<typeof readdir>>;
  try {
    entries = await readdir(screenshotDir, { withFileTypes: true });
  } catch {
    return null;
  }

  const candidates = await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map(async (entry) => {
        const path = join(screenshotDir, entry.name);
        try {
          const fileStat = await stat(path);
          return { path, filename: entry.name, modifiedAtMs: fileStat.mtimeMs };
        } catch {
          return null;
        }
      }),
  );
  const latestPath = selectLatestScreenshotPath(
    candidates.filter((candidate) => candidate !== null),
    {
      excludedImagePaths: request.excludedImagePaths,
    },
  );
  return latestPath && isReadableAutoStartImagePath(latestPath) ? latestPath : null;
}

/**
 * Finder で選択中の画像パスを解決する
 */
export async function resolveSelectedFinderImagePaths(): Promise<string[]> {
  const items = await getSelectedFinderItems();
  return items.map((item) => item.path).filter((path) => isReadableAutoStartImagePath(path));
}

/**
 * macOS のスクリーンショット保存先を defaults から解決する
 */
async function resolveMacScreenshotDirectory(): Promise<string> {
  try {
    const { stdout } = await execFileAsync("/usr/bin/defaults", ["read", "com.apple.screencapture", "location"], {
      timeout: 5000,
    });
    const configuredPath = stdout.trim();
    if (configuredPath) {
      return configuredPath.replace(/^~(?=\/|$)/, homedir());
    }
  } catch {
    // 未設定時は Desktop へフォールバックする
  }
  return join(homedir(), "Desktop");
}

/**
 * macOS のクリップボード画像を一時 PNG として保存する
 */
async function extractNativeClipboardImage(args: { excludedImagePaths: Set<string> }): Promise<string | null> {
  const outputDir = join(tmpdir(), "worktree-deck-clipboard-images");
  await mkdir(outputDir, { recursive: true });
  const pngPath = join(outputDir, `${randomUUID()}.png`);
  if (await writeClipboardImageDataToFile({ format: "png", outputPath: pngPath })) {
    return (await isDuplicateImageFile({ path: pngPath, comparedPaths: args.excludedImagePaths })) ? null : pngPath;
  }

  const tiffPath = join(outputDir, `${randomUUID()}.tiff`);
  if (!(await writeClipboardImageDataToFile({ format: "tiff", outputPath: tiffPath }))) {
    return null;
  }
  try {
    await execFileAsync("/usr/bin/sips", ["-s", "format", "png", tiffPath, "--out", pngPath], { timeout: 5000 });
    if (!(await isNonEmptyFile(pngPath))) {
      return null;
    }
    return (await isDuplicateImageFile({ path: pngPath, comparedPaths: args.excludedImagePaths })) ? null : pngPath;
  } finally {
    await rm(tiffPath, { force: true });
  }
}

/**
 * Clipboard 読み取り内容から添付可能な画像パスを取り出す
 */
function resolveClipboardContentImagePath(args: {
  content: Clipboard.ReadContent;
  excludedImagePaths: Set<string>;
}): string | null {
  const candidates = [args.content.file?.toString(), args.content.text];
  for (const candidate of candidates) {
    const path = candidate?.trim();
    if (path && !args.excludedImagePaths.has(path) && isReadableAutoStartImagePath(path)) {
      return path;
    }
  }
  return null;
}

/**
 * 既存添付と同じ画像内容なら一時ファイルを破棄する
 */
async function isDuplicateImageFile(args: { path: string; comparedPaths: Set<string> }): Promise<boolean> {
  const pathHash = await hashFile(args.path);
  if (!pathHash) {
    await rm(args.path, { force: true });
    return true;
  }
  for (const comparedPath of args.comparedPaths) {
    const comparedHash = await hashFile(comparedPath);
    if (comparedHash && comparedHash === pathHash) {
      await rm(args.path, { force: true });
      return true;
    }
  }
  return false;
}

/**
 * ファイル内容の SHA-256 を返す
 */
async function hashFile(path: string): Promise<string | null> {
  try {
    const data = await readFile(path);
    return createHash("sha256").update(data).digest("hex");
  } catch {
    return null;
  }
}

/**
 * AppleScript 経由でクリップボード画像データを書き出す
 */
async function writeClipboardImageDataToFile(args: { format: "png" | "tiff"; outputPath: string }): Promise<boolean> {
  const script = `
on run argv
  set outputPath to item 1 of argv
  set imageFormat to item 2 of argv
  if imageFormat is "png" then
    set imageData to the clipboard as «class PNGf»
  else
    set imageData to the clipboard as TIFF picture
  end if
  set outputFile to open for access (POSIX file outputPath) with write permission
  try
    set eof outputFile to 0
    write imageData to outputFile
    close access outputFile
  on error errorMessage
    try
      close access outputFile
    end try
    error errorMessage
  end try
end run
`;
  try {
    await execFileAsync("/usr/bin/osascript", ["-e", script, args.outputPath, args.format], { timeout: 5000 });
    return isNonEmptyFile(args.outputPath);
  } catch {
    await rm(args.outputPath, { force: true });
    return false;
  }
}

/**
 * 空ではないファイルか判定する
 */
async function isNonEmptyFile(path: string): Promise<boolean> {
  try {
    const fileStat = await stat(path);
    return fileStat.isFile() && fileStat.size > 0;
  } catch {
    return false;
  }
}

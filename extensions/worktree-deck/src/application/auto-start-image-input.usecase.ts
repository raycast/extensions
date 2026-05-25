/**
 * Auto Start 画像入力の依存ポート
 */
export type AutoStartImageInputDependencies = {
  isReadableImagePath(path: string): boolean;
  resolveClipboardImagePath(request?: AutoStartImagePathResolutionRequest): Promise<string | null>;
  resolveLatestScreenshotImagePath(request?: AutoStartImagePathResolutionRequest): Promise<string | null>;
  resolveSelectedFinderImagePaths(): Promise<string[]>;
};

/**
 * 画像パス解決時に除外する既存添付の指定
 */
export type AutoStartImagePathResolutionRequest = {
  excludedImagePaths?: string[];
};

/**
 * 画像パスを重複なしの配列へ正規化する
 */
export function normalizeAutoStartImagePaths(paths: string[]): string[] {
  return appendUniqueImagePaths([], paths);
}

/**
 * 改行区切りの画像パステキストを配列へ変換する
 */
export function parseAutoStartImagePathsText(value: string): string[] {
  return normalizeAutoStartImagePaths(value.split(/\r?\n/));
}

/**
 * 画像パス配列をフォーム表示用テキストへ変換する
 */
export function formatAutoStartImagePathsText(paths: string[]): string {
  return normalizeAutoStartImagePaths(paths).join("\n");
}

/**
 * 既存配列へ画像パスを重複なしで追加する
 */
export function appendUniqueImagePaths(current: string[], additions: string[]): string[] {
  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const rawPath of [...current, ...additions]) {
    const path = rawPath.trim();
    if (!path || seen.has(path)) {
      continue;
    }
    seen.add(path);
    normalized.push(path);
  }
  return normalized;
}

/**
 * Auto Start に渡せない画像パスを返す
 */
function findInvalidImagePath(args: {
  imagePaths: string[];
  dependencies: AutoStartImageInputDependencies;
}): string | null {
  return args.imagePaths.find((path) => !args.dependencies.isReadableImagePath(path)) ?? null;
}

/**
 * クリップボードから画像パスを解決する
 */
async function resolveClipboardImagePath(args: {
  existingImagePaths?: string[];
  dependencies: AutoStartImageInputDependencies;
}): Promise<string | null> {
  return args.dependencies.resolveClipboardImagePath({
    excludedImagePaths: normalizeAutoStartImagePaths(args.existingImagePaths ?? []),
  });
}

/**
 * Finder 選択中の画像パスを解決する
 */
async function resolveSelectedFinderImagePaths(args: {
  dependencies: AutoStartImageInputDependencies;
}): Promise<string[]> {
  return normalizeAutoStartImagePaths(await args.dependencies.resolveSelectedFinderImagePaths());
}

/**
 * 最新スクリーンショットの画像パスを解決する
 */
async function resolveLatestScreenshotImagePath(args: {
  existingImagePaths?: string[];
  dependencies: AutoStartImageInputDependencies;
}): Promise<string | null> {
  return args.dependencies.resolveLatestScreenshotImagePath({
    excludedImagePaths: normalizeAutoStartImagePaths(args.existingImagePaths ?? []),
  });
}

/**
 * Auto Start 画像入力ユースケース関数群
 */
export const autoStartImageInputUsecase = {
  findInvalidImagePath,
  resolveClipboardImagePath,
  resolveLatestScreenshotImagePath,
  resolveSelectedFinderImagePaths,
} as const;

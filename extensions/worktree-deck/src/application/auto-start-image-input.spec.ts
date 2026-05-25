import { describe, expect, it, vi } from "vitest";
import {
  appendUniqueImagePaths,
  autoStartImageInputUsecase,
  formatAutoStartImagePathsText,
  normalizeAutoStartImagePaths,
  parseAutoStartImagePathsText,
} from "./auto-start-image-input.usecase";

describe("normalizeAutoStartImagePaths", () => {
  it("空白と重複を取り除く", () => {
    expect(normalizeAutoStartImagePaths([" /tmp/a.png ", "", "/tmp/a.png", "/tmp/b.jpg"])).toEqual([
      "/tmp/a.png",
      "/tmp/b.jpg",
    ]);
  });
});

describe("parseAutoStartImagePathsText", () => {
  it("改行区切りの画像パスを配列へ変換する", () => {
    expect(parseAutoStartImagePathsText(" /tmp/a.png\n\n/tmp/b.jpg\r\n/tmp/a.png ")).toEqual([
      "/tmp/a.png",
      "/tmp/b.jpg",
    ]);
  });
});

describe("formatAutoStartImagePathsText", () => {
  it("画像パス配列を改行区切りのテキストへ変換する", () => {
    expect(formatAutoStartImagePathsText([" /tmp/a.png ", "/tmp/b.jpg"])).toBe("/tmp/a.png\n/tmp/b.jpg");
  });
});

describe("appendUniqueImagePaths", () => {
  it("既存の順序を保って新しい画像だけ追加する", () => {
    expect(appendUniqueImagePaths(["/tmp/a.png"], ["/tmp/a.png", "/tmp/b.jpg"])).toEqual(["/tmp/a.png", "/tmp/b.jpg"]);
  });
});

describe("autoStartImageInputUsecase.findInvalidImagePath", () => {
  it("読めない画像パスを返す", () => {
    const result = autoStartImageInputUsecase.findInvalidImagePath({
      imagePaths: ["/tmp/a.png", "/tmp/missing.png"],
      dependencies: {
        isReadableImagePath: (path) => path !== "/tmp/missing.png",
        resolveClipboardImagePath: async () => null,
        resolveLatestScreenshotImagePath: async () => null,
        resolveSelectedFinderImagePaths: async () => [],
      },
    });

    expect(result).toBe("/tmp/missing.png");
  });
});

describe("autoStartImageInputUsecase.resolveClipboardImagePath", () => {
  it("依存ポートで解決したクリップボード画像パスを返す", async () => {
    const result = await autoStartImageInputUsecase.resolveClipboardImagePath({
      dependencies: {
        isReadableImagePath: () => false,
        resolveClipboardImagePath: async () => "/tmp/clipboard.png",
        resolveLatestScreenshotImagePath: async () => null,
        resolveSelectedFinderImagePaths: async () => [],
      },
    });

    expect(result).toBe("/tmp/clipboard.png");
  });

  it("添付済み画像パスを除外指定として依存ポートへ渡す", async () => {
    const resolveClipboardImagePath = vi.fn(async () => "/tmp/next.png");
    const result = await autoStartImageInputUsecase.resolveClipboardImagePath({
      existingImagePaths: [" /tmp/current.png ", "/tmp/current.png"],
      dependencies: {
        isReadableImagePath: () => false,
        resolveClipboardImagePath,
        resolveLatestScreenshotImagePath: async () => null,
        resolveSelectedFinderImagePaths: async () => [],
      },
    });

    expect(result).toBe("/tmp/next.png");
    expect(resolveClipboardImagePath).toHaveBeenCalledWith({ excludedImagePaths: ["/tmp/current.png"] });
  });
});

describe("autoStartImageInputUsecase.resolveLatestScreenshotImagePath", () => {
  it("依存ポートで解決した最新スクリーンショット画像パスを返す", async () => {
    const result = await autoStartImageInputUsecase.resolveLatestScreenshotImagePath({
      dependencies: {
        isReadableImagePath: () => false,
        resolveClipboardImagePath: async () => null,
        resolveLatestScreenshotImagePath: async () => "/tmp/Screenshot.png",
        resolveSelectedFinderImagePaths: async () => [],
      },
    });

    expect(result).toBe("/tmp/Screenshot.png");
  });

  it("添付済み画像パスを除外指定として依存ポートへ渡す", async () => {
    const resolveLatestScreenshotImagePath = vi.fn(async () => "/tmp/Screenshot next.png");
    const result = await autoStartImageInputUsecase.resolveLatestScreenshotImagePath({
      existingImagePaths: ["/tmp/Screenshot latest.png"],
      dependencies: {
        isReadableImagePath: () => false,
        resolveClipboardImagePath: async () => null,
        resolveLatestScreenshotImagePath,
        resolveSelectedFinderImagePaths: async () => [],
      },
    });

    expect(result).toBe("/tmp/Screenshot next.png");
    expect(resolveLatestScreenshotImagePath).toHaveBeenCalledWith({
      excludedImagePaths: ["/tmp/Screenshot latest.png"],
    });
  });
});

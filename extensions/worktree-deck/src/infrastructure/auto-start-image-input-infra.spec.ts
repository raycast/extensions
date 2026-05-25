import { describe, expect, it } from "vitest";
import {
  isLikelyMacScreenshotFilename,
  isSupportedAutoStartImagePath,
  selectLatestScreenshotPath,
} from "./auto-start-image-input-infra";

describe("isSupportedAutoStartImagePath", () => {
  it("画像拡張子なら true を返す", () => {
    expect(isSupportedAutoStartImagePath("/tmp/design.PNG")).toBe(true);
  });

  it("画像以外の拡張子なら false を返す", () => {
    expect(isSupportedAutoStartImagePath("/tmp/design.txt")).toBe(false);
  });
});

describe("isLikelyMacScreenshotFilename", () => {
  it("macOS の英語スクリーンショット名なら true を返す", () => {
    expect(isLikelyMacScreenshotFilename("Screenshot 2026-05-23 at 10.00.00.png")).toBe(true);
    expect(isLikelyMacScreenshotFilename("Screen Shot 2026-05-23 at 10.00.00 AM.png")).toBe(true);
  });

  it("macOS の日本語スクリーンショット名なら true を返す", () => {
    expect(isLikelyMacScreenshotFilename("スクリーンショット 2026-05-23 10.00.00.png")).toBe(true);
  });

  it("通常の画像名なら false を返す", () => {
    expect(isLikelyMacScreenshotFilename("design.png")).toBe(false);
  });
});

describe("selectLatestScreenshotPath", () => {
  it("スクリーンショット候補から更新日時が最新の画像を返す", () => {
    expect(
      selectLatestScreenshotPath([
        { path: "/Desktop/Screenshot old.png", filename: "Screenshot old.png", modifiedAtMs: 100 },
        { path: "/Desktop/Screenshot new.png", filename: "Screenshot new.png", modifiedAtMs: 300 },
        { path: "/Desktop/design.png", filename: "design.png", modifiedAtMs: 500 },
      ]),
    ).toBe("/Desktop/Screenshot new.png");
  });

  it("除外済みスクリーンショットを飛ばして次に新しい画像を返す", () => {
    expect(
      selectLatestScreenshotPath(
        [
          { path: "/Desktop/Screenshot old.png", filename: "Screenshot old.png", modifiedAtMs: 100 },
          { path: "/Desktop/Screenshot newer.png", filename: "Screenshot newer.png", modifiedAtMs: 200 },
          { path: "/Desktop/Screenshot latest.png", filename: "Screenshot latest.png", modifiedAtMs: 300 },
        ],
        { excludedImagePaths: ["/Desktop/Screenshot latest.png"] },
      ),
    ).toBe("/Desktop/Screenshot newer.png");
  });

  it("スクリーンショット画像候補がない場合は null を返す", () => {
    expect(
      selectLatestScreenshotPath([
        { path: "/Desktop/Screenshot.txt", filename: "Screenshot.txt", modifiedAtMs: 300 },
        { path: "/Desktop/design.png", filename: "design.png", modifiedAtMs: 500 },
      ]),
    ).toBeNull();
  });
});

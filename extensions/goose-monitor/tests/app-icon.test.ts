import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { GENERIC_APP_ICON } from "../src/lib/app-icon";

/** 兜底图标是按文件名引用的 assets 资源：文件缺失 / 被换成非透明图都不会编译报错，只会在界面上静默变空白。 */
describe("通用应用图标资源", () => {
  const png = readFileSync(new URL(`../assets/${GENERIC_APP_ICON}`, import.meta.url));

  test("assets 下同名文件是 PNG", () => {
    expect(png.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    expect(png.subarray(12, 16).toString("ascii")).toBe("IHDR");
  });

  test("保留透明通道，尺寸够 Retina 列表与菜单栏用", () => {
    const width = png.readUInt32BE(16);
    expect(png[25]).toBe(6); // colorType 6 = RGBA
    expect(width).toBeGreaterThanOrEqual(256);
    expect(png.readUInt32BE(20)).toBe(width);
  });
});

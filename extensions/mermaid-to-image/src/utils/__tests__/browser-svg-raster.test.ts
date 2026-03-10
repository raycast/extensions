import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderSvgToRasterWithBrowser } from "../browser-svg-raster";

const tempDirs: string[] = [];

afterEach(() => {
  vi.restoreAllMocks();
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function createTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "browser-svg-raster-test-"));
  tempDirs.push(dir);
  return dir;
}

describe("renderSvgToRasterWithBrowser", () => {
  it("uses the resolved browser executable and writes a png screenshot", async () => {
    const tmpDir = createTempDir();
    const outputPath = path.join(tmpDir, "diagram.png");
    const execFile = vi.fn(async () => {
      fs.writeFileSync(outputPath, "png");
      return { stdout: "", stderr: "" };
    });

    const result = await renderSvgToRasterWithBrowser(
      {
        svgContent: '<svg width="720" height="464" viewBox="0 0 720 464"></svg>',
        baseName: "diagram",
        tmpDir,
        browserExecutablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      },
      {
        execFile,
      },
    );

    expect(execFile).toHaveBeenCalledTimes(1);
    expect(execFile.mock.calls[0]?.[0]).toBe("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
    expect(execFile.mock.calls[0]?.[1]).toContain("--headless");
    expect(execFile.mock.calls[0]?.[1]).toContain(`--screenshot=${outputPath}`);
    expect(execFile.mock.calls[0]?.[1]).toContain("--window-size=2160,1392");
    expect(result.path).toBe(outputPath);
    expect(result.tempPaths.some((tempPath) => tempPath.endsWith(".html"))).toBe(true);
    expect(result.tempPaths.some((tempPath) => tempPath.endsWith(".svg"))).toBe(true);
    expect(result.tempPaths).toContain(outputPath);
  });
});

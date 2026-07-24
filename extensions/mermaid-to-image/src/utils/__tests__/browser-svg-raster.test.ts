import fs from "fs";
import os from "os";
import path from "path";
import type { execFile as execFileCallback } from "child_process";
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
    const execFileSpy = vi.fn(() => {
      fs.writeFileSync(outputPath, "png");
      return Object.assign(Promise.resolve({ stdout: "", stderr: "" }), {
        child: {} as ReturnType<typeof execFileCallback>,
      });
    });

    const result = await renderSvgToRasterWithBrowser(
      {
        svgContent: '<svg width="720" height="464" viewBox="0 0 720 464"></svg>',
        baseName: "diagram",
        tmpDir,
        browserExecutablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      },
      {
        execFile: execFileSpy as never,
      },
    );

    expect(execFileSpy).toHaveBeenCalledTimes(1);
    const firstCall = execFileSpy.mock.calls[0] as unknown as [string, string[]];
    const [calledFile, calledArgs] = firstCall;
    expect(calledFile).toBe("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
    expect(calledArgs).toContain("--headless");
    expect(calledArgs).toContain(`--screenshot=${outputPath}`);
    expect(calledArgs).toContain("--window-size=2160,1392");
    expect(result.path).toBe(outputPath);
    expect(result.tempPaths.some((tempPath) => tempPath.endsWith(".html"))).toBe(true);
    expect(result.tempPaths.some((tempPath) => tempPath.endsWith(".svg"))).toBe(true);
    expect(result.tempPaths).toContain(outputPath);
  });
});

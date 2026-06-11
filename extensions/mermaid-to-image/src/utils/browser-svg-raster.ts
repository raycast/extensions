import fs from "fs";
import os from "os";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { pathToFileURL } from "url";
import type { SvgRasterizationResult } from "./svg-raster";
import { getSupersampledSize, parseSvgPixelDimensions } from "./svg-preview";

const execFilePromise = promisify(execFile);
const DEFAULT_BROWSER_SVG_FACTOR = 3;
const DEFAULT_BROWSER_SVG_MAX_EDGE = 4096;

export interface BrowserSvgRasterOptions {
  svgContent: string;
  baseName: string;
  browserExecutablePath: string;
  tmpDir?: string;
  factor?: number;
  maxEdge?: number;
}

interface BrowserSvgRasterDependencies {
  execFile: typeof execFilePromise;
  writeFile: typeof fs.writeFileSync;
  fileExists: typeof fs.existsSync;
}

function createBrowserSvgRasterDependencies(): BrowserSvgRasterDependencies {
  return {
    execFile: execFilePromise,
    writeFile: fs.writeFileSync,
    fileExists: fs.existsSync,
  };
}

function buildHtmlShell(svgPath: string, width: number, height: number): string {
  const svgUrl = pathToFileURL(svgPath).toString();
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: ${width}px;
        height: ${height}px;
        overflow: hidden;
        background: transparent;
      }
      img {
        display: block;
        width: ${width}px;
        height: ${height}px;
      }
    </style>
  </head>
  <body>
    <img src="${svgUrl}" />
  </body>
</html>`;
}

export async function renderSvgToRasterWithBrowser(
  {
    svgContent,
    baseName,
    browserExecutablePath,
    tmpDir = os.tmpdir(),
    factor = DEFAULT_BROWSER_SVG_FACTOR,
    maxEdge = DEFAULT_BROWSER_SVG_MAX_EDGE,
  }: BrowserSvgRasterOptions,
  dependencies: Partial<BrowserSvgRasterDependencies> = {},
): Promise<SvgRasterizationResult> {
  const resolvedDependencies = {
    ...createBrowserSvgRasterDependencies(),
    ...dependencies,
  };
  const svgDimensions = parseSvgPixelDimensions(svgContent) ?? { width: 1024, height: 1024 };
  const supersampled = getSupersampledSize(svgDimensions, factor, maxEdge);
  const svgPath = path.join(tmpDir, `${baseName}.svg`);
  const htmlPath = path.join(tmpDir, `${baseName}.html`);
  const outputPath = path.join(tmpDir, `${baseName}.png`);

  resolvedDependencies.writeFile(svgPath, svgContent, "utf-8");
  resolvedDependencies.writeFile(htmlPath, buildHtmlShell(svgPath, supersampled.width, supersampled.height), "utf-8");

  await resolvedDependencies.execFile(browserExecutablePath, [
    "--headless",
    "--disable-gpu",
    "--hide-scrollbars",
    "--allow-file-access-from-files",
    "--force-device-scale-factor=1",
    "--default-background-color=00000000",
    `--window-size=${supersampled.width},${supersampled.height}`,
    `--screenshot=${outputPath}`,
    "--run-all-compositor-stages-before-draw",
    "--virtual-time-budget=1000",
    pathToFileURL(htmlPath).toString(),
  ]);

  if (!resolvedDependencies.fileExists(outputPath)) {
    throw new Error("browser screenshot did not produce a PNG output file");
  }

  return {
    path: outputPath,
    tempPaths: [svgPath, htmlPath, outputPath],
  };
}

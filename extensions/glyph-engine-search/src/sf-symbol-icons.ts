import { Color, Icon, environment, type Image } from "@raycast/api";
import { execFile } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const iconDirectory = join(environment.supportPath, "sf-symbol-icons-v1");
const rendererPath = join(environment.assetsPath, "render-sf-symbol-icon.jxa");
const renderTimeoutMilliseconds = 15_000;
const symbolIconFallback: Image.ImageLike = { source: Icon.Circle, tintColor: Color.PrimaryText };
let batchRenderPromise: Promise<Record<string, string>> | undefined;

function cacheFilename(symbolName: string): string {
  return `${symbolName.replace(/[^A-Za-z0-9._-]/g, "_")}.png`;
}

export function cachedSFSymbolIconPath(symbolName: string): string {
  return join(iconDirectory, cacheFilename(symbolName));
}

export function sfSymbolIcon(symbolName: string, renderedIconPaths: Record<string, string>): Image.ImageLike {
  const renderedPath = renderedIconPaths[symbolName];
  if (!renderedPath) {
    return symbolIconFallback;
  }

  return {
    source: renderedPath,
    fallback: Icon.Circle,
    tintColor: Color.PrimaryText,
  };
}

export async function renderSFSymbolIcons(symbolNames: string[]): Promise<Record<string, string>> {
  if (batchRenderPromise) {
    await batchRenderPromise;
  }

  batchRenderPromise = renderSFSymbolIconBatch(symbolNames);
  try {
    return await batchRenderPromise;
  } finally {
    batchRenderPromise = undefined;
  }
}

async function renderSFSymbolIconBatch(symbolNames: string[]): Promise<Record<string, string>> {
  const uniqueNames = [...new Set(symbolNames)];
  const renderedPaths: Record<string, string> = {};
  const namesToRender: string[] = [];

  mkdirSync(iconDirectory, { recursive: true });
  for (const symbolName of uniqueNames) {
    const iconPath = cachedSFSymbolIconPath(symbolName);
    if (existsSync(iconPath)) {
      renderedPaths[symbolName] = iconPath;
    } else {
      namesToRender.push(symbolName);
    }
  }

  if (namesToRender.length === 0) {
    return renderedPaths;
  }

  try {
    await execFileAsync("/usr/bin/osascript", ["-l", "JavaScript", rendererPath, iconDirectory, ...namesToRender], {
      timeout: renderTimeoutMilliseconds,
    });
  } catch (error) {
    console.warn("Failed to render SF Symbol icons", error);
  }

  for (const symbolName of namesToRender) {
    const iconPath = cachedSFSymbolIconPath(symbolName);
    if (existsSync(iconPath)) {
      renderedPaths[symbolName] = iconPath;
    }
  }

  return renderedPaths;
}

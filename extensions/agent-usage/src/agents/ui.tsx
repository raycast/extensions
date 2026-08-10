import { environment, Image, List } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import * as fs from "fs";
import * as path from "path";
import type { Accessory } from "./types";
import { invertMonochromeSvg, scaleSvgViewBox } from "./icon-svg";

type ErrorLike = { type: string; message: string };
const LIST_ICON_SCALE = 0.8;
const listIconCache = new Map<string, Image.ImageLike>();
const themeIconCache = new Map<string, Image.ImageLike>();

function getProgressColor(percent: number): string {
  if (percent >= 50) return "#30D158";
  if (percent >= 20) return "#FF9F0A";
  return "#FF453A";
}

export function generateAsciiBar(percent: number, width = 15): string {
  const p = Math.max(0, Math.min(100, percent));
  const filled = Math.round((p / 100) * width);
  return "▰".repeat(filled) + "▱".repeat(width - filled);
}

export function generatePieIcon(percent: number): Image.ImageLike {
  const p = Math.max(0, Math.min(100, percent));
  return getProgressIcon(p / 100, getProgressColor(p));
}

/**
 * List-row icon: scales SVG slightly and auto-pairs a dark variant for monochrome assets.
 * Brand-colored SVGs and non-SVG assets are left unchanged (aside from list scaling for SVG).
 */
export function getListIcon(assetName: string): Image.ImageLike {
  const cached = listIconCache.get(assetName);
  if (cached) return cached;

  const icon = resolveAssetIcon(assetName, { scale: LIST_ICON_SCALE, cacheDir: "list-icons" });
  listIconCache.set(assetName, icon);
  return icon;
}

/**
 * Theme-aware asset icon for menu bar / other surfaces (no list scaling).
 * Monochrome SVGs get an auto-generated dark invert; colored icons stay as-is.
 */
export function getThemeIcon(assetName: string): Image.ImageLike {
  const cached = themeIconCache.get(assetName);
  if (cached) return cached;

  const icon = resolveAssetIcon(assetName, { scale: 1, cacheDir: "theme-icons" });
  themeIconCache.set(assetName, icon);
  return icon;
}

function resolveAssetIcon(assetName: string, options: { scale: number; cacheDir: string }): Image.ImageLike {
  if (path.extname(assetName).toLowerCase() !== ".svg") {
    return assetName;
  }

  try {
    const assetPath = path.join(environment.assetsPath, assetName);
    const svg = fs.readFileSync(assetPath, "utf-8");
    const needsScale = options.scale !== 1;
    const inverted = invertMonochromeSvg(svg);

    // Colored icons without list scaling: use the packaged asset as-is.
    if (!needsScale && !inverted) {
      return assetName;
    }

    const cacheRoot = path.join(environment.supportPath, options.cacheDir);
    fs.mkdirSync(cacheRoot, { recursive: true });

    const lightSource = needsScale
      ? writeProcessedIcon(assetPath, path.join(cacheRoot, assetName), scaleSvgViewBox(svg, options.scale))
      : assetName;

    if (!inverted) {
      return { source: lightSource, fallback: assetName };
    }

    const darkPath = writeProcessedIcon(
      assetPath,
      path.join(cacheRoot, toGeneratedDarkName(assetName)),
      scaleSvgViewBox(inverted, options.scale),
    );

    return {
      source: { light: lightSource, dark: darkPath },
      fallback: assetName,
    };
  } catch {
    return assetName;
  }
}

function toGeneratedDarkName(assetName: string): string {
  const extension = path.extname(assetName);
  const basename = assetName.slice(0, -extension.length);
  return `${basename}.dark${extension}`;
}

/**
 * Write processed icon when missing or contents changed.
 * Content comparison invalidates cache after invert/scale logic changes even if
 * the source asset mtime is unchanged.
 */
function writeProcessedIcon(_sourceAssetPath: string, iconPath: string, contents: string): string {
  try {
    if (fs.existsSync(iconPath) && fs.readFileSync(iconPath, "utf-8") === contents) {
      return iconPath;
    }
  } catch {
    // Fall through and rewrite.
  }
  fs.writeFileSync(iconPath, contents);
  return iconPath;
}

export function renderErrorDetail(error: { type: string; message: string }): React.ReactNode {
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Status" text="Error" />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Error Type" text={error.type} />
      <List.Item.Detail.Metadata.Label title="Message" text={error.message} />
    </List.Item.Detail.Metadata>
  );
}

export function renderNoDataDetail(): React.ReactNode {
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Status" text="No data available" />
    </List.Item.Detail.Metadata>
  );
}

export function getLoadingAccessory(label: string): Accessory {
  return { text: "Loading...", tooltip: `Fetching ${label} usage data` };
}

export function getNoDataAccessory(): Accessory {
  return { text: "—", tooltip: "No data available" };
}

/** Returns an error/no-data fallback ReactNode, or null if data is available. */
export function renderErrorOrNoData(usage: unknown, error: ErrorLike | null): React.ReactNode | null {
  if (error) return renderErrorDetail(error);
  if (!usage) return renderNoDataDetail();
  return null;
}

/** Returns an error/no-data fallback string, or null if data is available. */
export function formatErrorOrNoData(agentName: string, usage: unknown, error: ErrorLike | null): string | null {
  if (error) return `${agentName} Usage\nStatus: Error\nType: ${error.type}\nMessage: ${error.message}`;
  if (!usage) return `${agentName} Usage\nStatus: No data available`;
  return null;
}

import * as fs from "fs";
import * as path from "path";

import { environment, Image, List } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";

import {
  getDarkListIconAssetName,
  invertMonochromeSvg,
  invertSvgColors,
  scaleSvgViewBox,
  selectSourceForAppearance,
  shouldInvertListIcon,
} from "./icon-svg.ts";
import type { Accessory } from "./types.ts";
export { generateAsciiBar } from "./detail-format.ts";

type ErrorLike = { type: string; message: string };
const themeIconCache = new Map<string, Image.ImageLike>();

function getProgressColor(percent: number): string {
  if (percent >= 50) return "#30D158";
  if (percent >= 20) return "#FF9F0A";
  return "#FF453A";
}

export function generatePieIcon(percent: number): Image.ImageLike {
  const p = Math.max(0, Math.min(100, percent));
  return getProgressIcon(p / 100, getProgressColor(p));
}

/**
 * List-row icon: selects a packaged inverted asset in dark mode for allowlisted icons.
 * Packaged asset names are used because Raycast for Windows falls back when given an
 * absolute path to a generated SVG in the extension support directory.
 */
export function getListIcon(assetName: string): Image.ImageLike {
  if (!shouldInvertListIcon(assetName)) {
    return assetName;
  }
  return selectSourceForAppearance(assetName, getDarkListIconAssetName(assetName), environment.appearance);
}

/**
 * Theme-aware asset icon for menu bar / other surfaces (no list scaling).
 * Monochrome SVGs get an auto-generated dark invert; colored icons stay as-is.
 */
export function getThemeIcon(assetName: string): Image.ImageLike {
  const cached = themeIconCache.get(assetName);
  if (cached) return cached;

  const icon = resolveAssetIcon(assetName, { scale: 1, cacheDir: "theme-icons", darkVariant: "monochrome" });
  themeIconCache.set(assetName, icon);
  return icon;
}

function resolveAssetIcon(
  assetName: string,
  options: { scale: number; cacheDir: string; darkVariant: "none" | "monochrome" | "inverted" },
): Image.ImageLike {
  if (path.extname(assetName).toLowerCase() !== ".svg") {
    return assetName;
  }

  try {
    const assetPath = path.join(environment.assetsPath, assetName);
    const svg = fs.readFileSync(assetPath, "utf-8");
    const needsScale = options.scale !== 1;
    const inverted =
      options.darkVariant === "inverted"
        ? invertSvgColors(svg)
        : options.darkVariant === "monochrome"
          ? invertMonochromeSvg(svg)
          : null;

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

    if (options.darkVariant === "inverted") {
      return {
        source: selectSourceForAppearance(lightSource, darkPath, environment.appearance),
        fallback: assetName,
      };
    }

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

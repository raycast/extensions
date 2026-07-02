import { environment, Image, List } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import * as fs from "fs";
import * as path from "path";
import type { Accessory } from "./types";

type ErrorLike = { type: string; message: string };
const LIST_ICON_SCALE = 0.8;
const listIconCache = new Map<string, Image.ImageLike>();
const viewBoxPattern = /viewBox="([-0-9.]+)\s+([-0-9.]+)\s+([0-9.]+)\s+([0-9.]+)"/i;

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

export function getListIcon(assetName: string): Image.ImageLike {
  const cached = listIconCache.get(assetName);
  if (cached) return cached;

  if (path.extname(assetName).toLowerCase() !== ".svg") {
    listIconCache.set(assetName, assetName);
    return assetName;
  }

  try {
    const assetPath = path.join(environment.assetsPath, assetName);
    const iconPath = path.join(environment.supportPath, "list-icons", `${assetName}.svg`);
    fs.mkdirSync(path.dirname(iconPath), { recursive: true });
    writeScaledIconIfNeeded(assetPath, iconPath);

    const darkAssetName = getDarkAssetName(assetName);
    const darkAssetPath = path.join(environment.assetsPath, darkAssetName);
    const hasDarkAsset = fs.existsSync(darkAssetPath);

    const icon: Image.ImageLike = hasDarkAsset
      ? {
          source: { light: iconPath, dark: getScaledDarkIconPath(darkAssetName, darkAssetPath) },
          fallback: { light: assetName, dark: darkAssetName },
        }
      : { source: iconPath, fallback: assetName };
    listIconCache.set(assetName, icon);
    return icon;
  } catch {
    listIconCache.set(assetName, assetName);
    return assetName;
  }
}

function getDarkAssetName(assetName: string): string {
  const extension = path.extname(assetName);
  const basename = assetName.slice(0, -extension.length);
  return `${basename}@dark${extension}`;
}

function getScaledDarkIconPath(darkAssetName: string, darkAssetPath: string): string {
  const darkIconPath = path.join(environment.supportPath, "list-icons", `${darkAssetName}.svg`);
  writeScaledIconIfNeeded(darkAssetPath, darkIconPath);
  return darkIconPath;
}

function writeScaledIconIfNeeded(assetPath: string, iconPath: string): void {
  if (isGeneratedIconCurrent(assetPath, iconPath)) {
    return;
  }

  fs.writeFileSync(iconPath, getScaledIconSvg(assetPath));
}

function isGeneratedIconCurrent(assetPath: string, iconPath: string): boolean {
  try {
    return fs.statSync(iconPath).mtimeMs >= fs.statSync(assetPath).mtimeMs;
  } catch {
    return false;
  }
}

function getScaledIconSvg(assetPath: string): string {
  const svg = fs.readFileSync(assetPath, "utf-8");
  const match = viewBoxPattern.exec(svg);

  if (match) {
    const [, x, y, width, height] = match.map(Number);
    const nextWidth = width / LIST_ICON_SCALE;
    const nextHeight = height / LIST_ICON_SCALE;
    const nextX = x - (nextWidth - width) / 2;
    const nextY = y - (nextHeight - height) / 2;
    return svg.replace(
      viewBoxPattern,
      `viewBox="${formatSvgNumber(nextX)} ${formatSvgNumber(nextY)} ${formatSvgNumber(nextWidth)} ${formatSvgNumber(nextHeight)}"`,
    );
  }

  return svg;
}

function formatSvgNumber(value: number): string {
  const formatted = value.toFixed(4).replace(/\.0+$|(?<=\.\d*?)0+$/g, "");

  return formatted === "-0" ? "0" : formatted;
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

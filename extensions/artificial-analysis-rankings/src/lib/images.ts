import { environment, Color, type Image } from "@raycast/api";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { monogramSvg } from "./cards";
import { providerAsset } from "./providers";

export function svgImage(svg: string): string {
  const directory = path.join(environment.supportPath, "cards");
  mkdirSync(directory, { recursive: true });
  const filename = path.join(directory, `${createHash("sha256").update(svg).digest("hex").slice(0, 24)}.svg`);
  if (!existsSync(filename)) writeFileSync(filename, svg, "utf8");
  return filename;
}

export function logoSvg(creator: string): string {
  const asset = providerAsset(creator);
  return asset
    ? readFileSync(path.join(environment.assetsPath, asset), "utf8")
    : monogramSvg(creator, environment.appearance);
}

const providerIcons = new Map<string, Image.ImageLike>();

/** The provider's bundled logo, or a generated monogram; memoized because every list row asks for one. */
export function providerIcon(creator: string): Image.ImageLike {
  const key = `${environment.appearance}:${creator}`;
  let icon = providerIcons.get(key);
  if (!icon) {
    const asset = providerAsset(creator);
    icon = asset
      ? { source: asset, tintColor: Color.PrimaryText }
      : svgImage(monogramSvg(creator, environment.appearance));
    providerIcons.set(key, icon);
  }
  return icon;
}

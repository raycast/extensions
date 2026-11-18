import { environment, Image } from "@raycast/api";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Layout } from "./rapto";

const WIDTH = 64;
const HEIGHT = 40;
const GAP = 2;

function svg(zones: Layout["zones"], color: string): string {
  const rects = zones
    .map(([x, y, w, h]) => {
      const left = x * WIDTH + GAP / 2;
      const top = y * HEIGHT + GAP / 2;
      const width = Math.max(1, w * WIDTH - GAP);
      const height = Math.max(1, h * HEIGHT - GAP);
      return `<rect x="${left}" y="${top}" width="${width}" height="${height}" rx="3" fill="${color}" fill-opacity="0.18" stroke="${color}" stroke-width="1.5"/>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">${rects}</svg>`;
}

function file(zones: Layout["zones"], color: string): string {
  const directory = join(environment.supportPath, "layouts");
  const name =
    createHash("sha1")
      .update(JSON.stringify(zones) + color)
      .digest("hex") + ".svg";
  const path = join(directory, name);
  if (!existsSync(path)) {
    mkdirSync(directory, { recursive: true });
    writeFileSync(path, svg(zones, color));
  }
  return path;
}

/** A small picture of the layout's zones, drawn to match the light or dark theme. */
export function layoutPreview(layout: Layout): Image.ImageLike {
  return { source: { light: file(layout.zones, "#1f1f1f"), dark: file(layout.zones, "#f2f2f2") } };
}

// Raycast glue for SVG charts: theme detection + markdown image embedding.
// Charts are written to the extension's support directory and referenced by absolute path,
// sized with Raycast's raycast-width / raycast-height query params.

import { environment } from "@raycast/api";
import { createHash } from "crypto";
import { mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";
import { Theme } from "./charts";

const MAX_AGE_MS = 24 * 60 * 60 * 1000;
let pruned = false;

/** Charts are content-addressed and regenerated on demand, so files older than a day are dropped. */
function pruneOldCharts(dir: string): void {
  if (pruned) return;
  pruned = true;
  try {
    const cutoff = Date.now() - MAX_AGE_MS;
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(".svg")) continue;
      const file = join(dir, name);
      if (statSync(file).mtimeMs < cutoff) unlinkSync(file);
    }
  } catch {
    // best effort: a missing or locked file is not worth surfacing
  }
}

export function chartTheme(): Theme {
  return environment.appearance === "light" ? "light" : "dark";
}

function svgSize(svg: string): { w: number; h: number } {
  const m = svg.match(/width="(\d+(?:\.\d+)?)" height="(\d+(?:\.\d+)?)"/);
  return { w: Number(m?.[1] ?? 720), h: Number(m?.[2] ?? 240) };
}

/** Markdown image for an SVG. mode "file" (default) writes to supportPath; "data" inlines base64. */
export function chartMarkdown(
  svg: string,
  opts: { alt?: string; width?: number; mode?: "file" | "data" } = {},
): string {
  const { w, h } = svgSize(svg);
  const width = opts.width ?? w;
  const height = Math.round((h / w) * width);
  const size = `raycast-width=${width}&raycast-height=${height}`;
  if (opts.mode === "data") {
    return `![${opts.alt ?? "chart"}](data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}?${size})`;
  }
  const dir = join(environment.supportPath, "charts");
  mkdirSync(dir, { recursive: true });
  pruneOldCharts(dir);
  const file = join(dir, `${createHash("sha1").update(svg).digest("hex").slice(0, 16)}.svg`);
  writeFileSync(file, svg);
  return `![${opts.alt ?? "chart"}](${pathToFileURL(file).href}?${size})`;
}

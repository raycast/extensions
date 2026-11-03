import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { environment } from "@raycast/api";

import type { ChunkGrid } from "./bitfield";
import { renderHeatmapPng } from "./heatmap-png";
import type { Appearance } from "./heatmap-svg";

export interface HeatmapFile {
  filePath: string;
  hash: string;
}

export async function writeHeatmapFile(
  gid: string,
  grid: ChunkGrid,
  hash: string,
  appearance: Appearance,
): Promise<HeatmapFile> {
  const supportPath = environment.supportPath;
  await fs.mkdir(supportPath, { recursive: true });
  const filePath = path.join(supportPath, `chunk-${gid}-${hash}.png`);
  await fs.writeFile(filePath, renderHeatmapPng(grid, appearance));

  try {
    const files = await fs.readdir(supportPath);
    const currentName = path.basename(filePath);
    const mine = files
      .filter(
        (name) => name.startsWith(`chunk-${gid}-`) && name.endsWith(".png"),
      )
      .sort()
      .reverse();
    const keep = new Set([
      currentName,
      ...mine.filter((name) => name !== currentName).slice(0, 2),
    ]);
    for (const old of mine) {
      if (!keep.has(old)) {
        await fs.rm(path.join(supportPath, old), { force: true });
      }
    }
    const legacy = files.filter(
      (name) => name.startsWith(`chunk-${gid}-`) && name.endsWith(".svg"),
    );
    for (const old of legacy) {
      await fs.rm(path.join(supportPath, old), { force: true });
    }
  } catch {
    // Cleanup is best-effort; a stale image must never break the detail view.
  }

  return { filePath, hash };
}

export function heatmapMarkdown(filePath: string): string {
  return `![Chunk map](${pathToFileURL(filePath).href})`;
}

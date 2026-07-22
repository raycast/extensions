import { existsSync } from "node:fs";
import { join } from "node:path";
import { resolveCompanionPreset } from "./companion-catalog";

export type DetectedCompanionSeed = {
  presetId: string;
  path: string;
  arguments: string;
  marker: string;
};

type ResolvePreset = (presetId: string) => { path: string; arguments: string } | null;

/** Marker → preferred preset ids (first installed wins). */
const MARKER_PRESETS: Array<{ marker: string; presetIds: string[] }> = [
  { marker: ".cursor", presetIds: ["cursor"] },
  { marker: ".trae", presetIds: ["trae"] },
  { marker: ".vscode", presetIds: ["vscode"] },
  { marker: ".obsidian", presetIds: ["obsidian"] },
  { marker: ".git", presetIds: ["fork", "github-desktop"] },
];

export function detectCompanionSeed(
  directory: string,
  resolvePreset: ResolvePreset = resolveCompanionPreset,
): DetectedCompanionSeed | null {
  const trimmed = directory.trim();
  if (!trimmed || !existsSync(trimmed)) {
    return null;
  }

  for (const entry of MARKER_PRESETS) {
    const markerPath = join(trimmed, entry.marker);
    if (!existsSync(markerPath)) {
      continue;
    }
    for (const presetId of entry.presetIds) {
      const resolved = resolvePreset(presetId);
      if (resolved) {
        return {
          presetId,
          path: resolved.path,
          arguments: resolved.arguments,
          marker: entry.marker,
        };
      }
    }
  }

  return null;
}

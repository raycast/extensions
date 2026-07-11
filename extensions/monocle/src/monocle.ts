import { open, showHUD } from "@raycast/api";

export async function monocle(path: string, message: string) {
  await open(`monocle://${path}`);
  await showHUD(message);
}

export function parsePercent(input: string): number | null {
  const v = Number(input.trim());
  if (!Number.isFinite(v)) return null;
  if (v < 0 || v > 100) return null;
  return Math.round(v);
}

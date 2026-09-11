export const STAGE_LABELS: Record<string, string> = {
  scanning: "Scanning cards",
  filtering: "Filtering files",
  copying: "Copying files",
  verifying: "Verifying checksums",
  renaming: "Renaming files",
  ejecting: "Ejecting cards",
  done: "Done",
};

export function progressBar(current: number, total: number, width = 10): string {
  if (total === 0) return "";
  const filled = Math.round((current / total) * width);
  return "■".repeat(filled) + "□".repeat(width - filled);
}

export function formatElapsed(start: Date): string {
  const s = Math.floor((Date.now() - start.getTime()) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

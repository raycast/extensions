function clampProgress(progress: number): number {
  if (!Number.isFinite(progress)) {
    return 0;
  }
  return Math.min(1, Math.max(0, progress));
}

export function formatLinearProgress(progress: number, width = 12): string {
  const safeProgress = clampProgress(progress);
  const safeWidth = Number.isFinite(width) && width > 0 ? Math.floor(width) : 12;
  const filled = Math.round(safeProgress * safeWidth);
  const empty = Math.max(0, safeWidth - filled);
  const percent = Math.round(safeProgress * 100);
  return `[${"#".repeat(filled)}${"-".repeat(empty)}] ${percent}%`;
}

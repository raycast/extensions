export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

const PROGRESS_BAR_WIDTH = 24;

export function formatProgressLine(positionMs: number, durationMs: number): string {
  const ratio = durationMs > 0 ? Math.min(1, Math.max(0, positionMs / durationMs)) : 0;
  const filled = Math.round(ratio * (PROGRESS_BAR_WIDTH - 1));
  const bar = `${"━".repeat(filled)}●${"─".repeat(PROGRESS_BAR_WIDTH - 1 - filled)}`;
  return `${formatDuration(positionMs)} ${bar} ${formatDuration(durationMs)}`;
}

export function formatVolume(volume: number): string {
  return `${Math.round(volume * 100)}%`;
}

export function toLargeArtworkUrl(url: string | null): string | null {
  return url ? url.replace("-large", "-t500x500") : null;
}

export function escapeMarkdown(text: string): string {
  return text.replace(/[\\`*_#<>|]/g, "\\$&");
}

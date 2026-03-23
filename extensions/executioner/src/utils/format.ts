import prettyBytes from "pretty-bytes";

export function formatCpu(cpu: number): string {
  return `${cpu.toFixed(1)}%`;
}

export function formatMem(rssKb: number): string {
  return prettyBytes(rssKb * 1024);
}

export function formatElapsed(elapsed: string): string {
  // ps etime format: [[dd-]hh:]mm:ss
  const trimmed = elapsed.trim();

  const dayMatch = trimmed.match(/^(\d+)-(\d+):(\d+):(\d+)$/);
  if (dayMatch) {
    const [, d, h, m] = dayMatch;
    const days = parseInt(d);
    const hours = parseInt(h);
    const mins = parseInt(m);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }

  const hhmmss = trimmed.match(/^(\d+):(\d+):(\d+)$/);
  if (hhmmss) {
    const [, h, m] = hhmmss;
    const hours = parseInt(h);
    const mins = parseInt(m);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }

  const mmss = trimmed.match(/^(\d+):(\d+)$/);
  if (mmss) {
    const [, m, s] = mmss;
    const mins = parseInt(m);
    const secs = parseInt(s);
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  }

  return trimmed;
}

export function formatTimestamp(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Streaming progress detection for long-running winget operations.
 *
 * Fed stdout/stderr chunks; emits monotonically advancing progress states
 * (initializing → downloading → verifying → installing/uninstalling/repairing
 * → complete). Download progress is parsed from the four formats winget emits;
 * everything is best-effort UI sugar — operation RESULTS are decided by exit
 * codes (see parser.interpretOperationResult), never by these patterns.
 */

import { type WingetProgressState } from "./types";

const PHASE_PATTERNS: ReadonlyArray<{
  match: string;
  state: WingetProgressState;
}> = [
  {
    match: "Successfully verified installer hash",
    state: { type: "verifying" },
  },
  { match: "Starting package install", state: { type: "installing" } },
  { match: "Starting package uninstall", state: { type: "uninstalling" } },
  { match: "Starting package repair", state: { type: "repairing" } },
  {
    match: "Successfully installed",
    state: { type: "complete", success: true },
  },
  {
    match: "Successfully uninstalled",
    state: { type: "complete", success: true },
  },
  {
    match: "Repair operation completed",
    state: { type: "complete", success: true },
  },
  {
    match: "Installer downloaded:",
    state: { type: "complete", success: true },
  },
];

function normalizeToMB(value: number, unit: string): number {
  switch (unit) {
    case "KB":
      return Math.round((value / 1024) * 100) / 100;
    case "GB":
      return Math.round(value * 1024 * 100) / 100;
    default:
      return Math.round(value * 100) / 100;
  }
}

function parseProgressLine(line: string): WingetProgressState | null {
  // Download start
  if (/^Downloading\s+/i.test(line.trim())) {
    return { type: "downloading", current: 0, total: 0, unit: "MB" };
  }

  const download = parseDownloadProgress(line);
  if (download) return download;

  // Initialization: "Found GIMP [GIMP.GIMP.3] Version 3.0.6.1"
  if (line.includes("Found") && line.includes("Version")) return { type: "initializing" };

  for (const { match, state } of PHASE_PATTERNS) {
    if (line.includes(match)) return state;
  }

  return null;
}

function parseDownloadProgress(line: string): WingetProgressState | null {
  // "189 MB / 296 MB" or "1024 KB / 13.3 MB"
  const dual = line.match(/(\d+(?:\.\d+)?)\s*(KB|MB|GB)\s*\/\s*(\d+(?:\.\d+)?)\s*(KB|MB|GB)/i);
  if (dual?.[1] && dual[2] && dual[3] && dual[4]) {
    return {
      type: "downloading",
      current: normalizeToMB(parseFloat(dual[1]), dual[2].toUpperCase()),
      total: normalizeToMB(parseFloat(dual[3]), dual[4].toUpperCase()),
      unit: "MB",
    };
  }

  // "5.0/289.0 MB"
  const shared = line.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*(KB|MB|GB)/i);
  if (shared?.[1] && shared[2] && shared[3]) {
    const u = shared[3].toUpperCase();
    return {
      type: "downloading",
      current: normalizeToMB(parseFloat(shared[1]), u),
      total: normalizeToMB(parseFloat(shared[2]), u),
      unit: "MB",
    };
  }

  // "45%" — only when the line is otherwise progress-bar-like (avoid matching
  // arbitrary text that happens to contain a percentage).
  const pct = line.match(/(?:^|\s)(\d{1,3})%(?:\s|$)/);
  if (pct?.[1]) {
    const p = parseInt(pct[1], 10);
    if (p >= 0 && p <= 100) return { type: "downloading", current: p, total: 100, unit: "%" };
  }

  // "66.6 MB" (indeterminate)
  const solo = line.trim().match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)$/i);
  if (solo?.[1] && solo[2]) {
    const u = solo[2].toUpperCase();
    const val = u === "B" ? parseFloat(solo[1]) / (1024 * 1024) : normalizeToMB(parseFloat(solo[1]), u);
    return {
      type: "downloading",
      current: Math.round(val * 100) / 100,
      total: 0,
      unit: "MB",
    };
  }

  return null;
}

const STATE_ORDER: Record<WingetProgressState["type"], number> = {
  initializing: 0,
  downloading: 1,
  verifying: 2,
  installing: 3,
  uninstalling: 3,
  repairing: 3,
  complete: 4,
};

const MAX_BUFFER_SIZE = 64 * 1024;

/**
 * Stateful chunk-fed detector. Only COMPLETE lines are parsed for progress
 * (the tail of the last partial line is carried to the next feed), so a
 * pattern split across chunk boundaries is never missed. The full rolling
 * buffer is retained (capped) for result-message extraction.
 */
class WingetProgressDetector {
  private buffer = "";
  private partialLine = "";
  private lastState: WingetProgressState = { type: "initializing" };

  constructor(private onProgress: (state: WingetProgressState) => void) {}

  feed(chunk: string): void {
    this.buffer += chunk;
    if (this.buffer.length > MAX_BUFFER_SIZE) {
      this.buffer = this.buffer.slice(this.buffer.length - MAX_BUFFER_SIZE);
    }

    const combined = this.partialLine + chunk;
    const segments = combined.split(/[\r\n]+/);
    this.partialLine = segments.pop() ?? "";

    for (const line of segments) {
      const state = parseProgressLine(line);
      if (state && this.isAdvance(state)) {
        this.lastState = state;
        this.onProgress(state);
      }
    }
  }

  /** Flush the trailing partial line (call when the stream ends). */
  flush(): void {
    if (!this.partialLine) return;
    const state = parseProgressLine(this.partialLine);
    this.partialLine = "";
    if (state && this.isAdvance(state)) {
      this.lastState = state;
      this.onProgress(state);
    }
  }

  /** Full (capped) output buffer for message extraction. */
  getBuffer(): string {
    return this.buffer;
  }

  private isAdvance(next: WingetProgressState): boolean {
    const prev = STATE_ORDER[this.lastState.type];
    const curr = STATE_ORDER[next.type];
    if (curr < prev) return false;
    if (next.type !== this.lastState.type) return true;
    if (next.type === "downloading" && this.lastState.type === "downloading") {
      return next.current > this.lastState.current;
    }
    return false;
  }
}

export { parseDownloadProgress, parseProgressLine, WingetProgressDetector };

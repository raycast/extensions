import path from "node:path";
import { PlaybackProbeResult } from "./types";

export function isDiscSource(probe: PlaybackProbeResult): boolean {
  let pathname = probe.mediaTarget;
  try {
    pathname = new URL(pathname).pathname;
  } catch {
    /* Local path. */
  }
  const container = (probe.container || path.extname(pathname).slice(1)).toLowerCase();
  return ["iso", "img", "bdmv"].includes(container) || /(?:^|\/)BDMV(?:\/|$)/i.test(pathname);
}

export function assertReadableVideoSource(probe: PlaybackProbeResult): void {
  let pathname = probe.mediaTarget;
  try {
    pathname = new URL(pathname).pathname;
  } catch {
    /* Local path. */
  }
  const container = (probe.container || path.extname(pathname).slice(1)).toLowerCase();
  if (["iso", "img", "bdmv", "dvd"].includes(container) || /(?:^|\/)BDMV(?:\/|$)/i.test(pathname)) {
    throw new Error(
      "Blu-ray and DVD disc images or disc folders aren't supported. Capture from an MKV remux of the disc instead.",
    );
  }
}

/** Stable identity of the video being played; server URLs carry tokens that may change. */
export function mediaIdentity(probe: PlaybackProbeResult): string {
  if (probe.itemId) return `item:${probe.itemId}:${probe.mediaSourceId ?? ""}`;
  return `path:${probe.mediaTarget}`;
}

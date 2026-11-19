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
      "This source is a disc image or disc folder, which can't be captured directly yet. The disc file system and main playlist must be read first; an ISO URL can't be read as a regular video. As a workaround, capture from a lossless MKV remux.",
    );
  }
}

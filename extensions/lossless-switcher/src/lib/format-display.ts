import { isLocalTrack, MusicState } from "./applescript";
import { formatSummary, NowPlaying } from "./nowplaying";

function rateLabel(hz: number): string {
  const khz = hz / 1000;
  return Number.isInteger(khz) ? `${khz} kHz` : `${khz.toFixed(1)} kHz`;
}

export function resolveFormatLine(
  music: MusicState,
  np: NowPlaying | null,
): string {
  if (isLocalTrack(music)) {
    if (!music.sampleRate) return "Format info unavailable";
    const parts = [rateLabel(music.sampleRate)];
    if (music.bitRate) parts.push(`${music.bitRate} kbps`);
    parts.push(music.kind || "local file");
    return parts.join(" · ");
  }
  if (!np || !np.sampleRate)
    return "Format not captured yet — skip to next track";
  return formatSummary(np);
}

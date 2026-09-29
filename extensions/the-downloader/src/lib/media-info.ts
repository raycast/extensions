import { heightOf } from "./estimate.js";
import { formatBytes } from "./format.js";
import { Video } from "../types.js";

// Formatting for the media preview and the form's details line.

const compact = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });

export function formatCount(value: number | null | undefined): string | undefined {
  return typeof value === "number" && value >= 0 ? compact.format(value) : undefined;
}

/** `20260903` → a localized date, or undefined when the extractor didn't give one. */
export function formatUploadDate(value: string | null | undefined): string | undefined {
  const match = /^(\d{4})(\d{2})(\d{2})$/.exec(value ?? "");
  if (!match) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

/** Common name for a height, e.g. 2160 → "4K". */
export function qualityName(height: number | undefined): string | undefined {
  if (!height) return undefined;
  if (height >= 4320) return "8K";
  if (height >= 2160) return "4K";
  if (height >= 1440) return "1440p";
  return `${height}p`;
}

function codecName(vcodec: string): string {
  if (vcodec.startsWith("avc1")) return "H.264";
  if (vcodec.startsWith("av01")) return "AV1";
  if (vcodec.startsWith("vp09") || vcodec.startsWith("vp9")) return "VP9";
  if (vcodec.startsWith("hev1") || vcodec.startsWith("hvc1")) return "HEVC";
  return vcodec.split(".")[0] || "—";
}

/** One row per distinct resolution / frame rate / codec, best first. */
export function formatRows(video: Video, limit = 10): string[][] {
  const rows = new Map<string, string[]>();
  for (const f of [...(video.formats ?? [])].reverse()) {
    if (!f.vcodec || f.vcodec === "none") continue;
    const height = heightOf(f);
    const fps = f.fps ? String(Math.round(f.fps)) : "";
    const codec = codecName(f.vcodec);
    const key = `${height}-${fps}-${codec}-${f.ext}`;
    const size = f.filesize ?? f.filesize_approx;
    const existing = rows.get(key);
    if (existing) {
      // Same row from another protocol or bitrate: keep the first, but borrow a size if it had none.
      if (existing[4] === "—" && size) existing[4] = formatBytes(size);
      continue;
    }
    if (rows.size >= limit) continue;
    rows.set(key, [
      height ? `${height}p` : f.resolution || "—",
      fps || "—",
      codec,
      f.ext.toUpperCase(),
      size ? formatBytes(size) : "—",
    ]);
  }
  return [...rows.values()];
}

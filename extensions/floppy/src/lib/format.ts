import { Icon } from "@raycast/api";
import type { LinkSummary, Reader } from "./api";

export function bytes(n: number) {
  if (n < 1000) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n;
  let i = -1;
  do {
    v /= 1000;
    i++;
  } while (v >= 1000 && i < units.length - 1);
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

export function ago(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function duration(ms: number) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return s % 60 ? `${m}m ${s % 60}s` : `${m}m`;
}

/** "fpy.sh/k3x9" */
export const shortUrl = (url: string) => url.replace(/^https?:\/\//, "");

export function kindIcon(kind: LinkSummary["kind"] | undefined) {
  switch (kind) {
    case "pdf":
      return Icon.Document;
    case "image":
      return Icon.Image;
    case "video":
      return Icon.Video;
    case "audio":
      return Icon.Music;
    case "zip":
      return Icon.Box;
    default:
      return Icon.BlankDocument;
  }
}

/** The share's label, or "General · visitor 1" for visits through the link's own URL. */
const label = (r: Reader) => r.label;

/** One line per person: who, how far they read, for how long, when. */
export function readerLine(r: Reader) {
  return [readerPages(r), duration(r.active_ms), ago(r.last_seen), readerPlace(r)].filter(Boolean).join(" · ");
}

export const readerPages = (r: Reader) =>
  r.pages_total ? `${r.pages_reached} of ${r.pages_total} pages` : `${Math.round(r.completion * 100)}% read`;

export const readerPlace = (r: Reader) => [r.device, r.city].filter(Boolean).join(", ");

export function readersMarkdown(name: string, url: string, people: Reader[], views: number) {
  const head = `## ${name}\n\n[${shortUrl(url)}](${url}) · ${views} ${views === 1 ? "view" : "views"}\n\n`;
  if (!people.length) return `${head}Nobody has read it yet.`;
  return (
    head +
    people.map((r) => `**${label(r)}**  \n${readerLine(r)}${r.visits > 1 ? ` · ${r.visits} visits` : ""}`).join("\n\n")
  );
}

export const readerName = label;

import type { FlashData } from "@flashdata-dev/sdk";

export const google = ["google_images", "google_news", "google_shopping", "google_videos", "google_places"] as const;
type Google = (typeof google)[number];
export type Source =
  | Google
  | "youtube_search"
  | "youtube_search_extended"
  | "youtube_metadata"
  | "youtube_channel"
  | "youtube_transcript"
  | "youtube_captions"
  | "youtube_trainability"
  | "youtube_suggestions";
export type Input = { term: string; count?: string; country?: string; language?: string };
export function countLimit(s: Source) {
  return s === "youtube_search_extended"
    ? 700
    : s === "youtube_search"
      ? 20
      : s === "youtube_channel" || s.startsWith("google_")
        ? 100
        : 0;
}
export function videoId(value: string) {
  let id = value.trim();
  if (!/^[\w-]{11}$/.test(id)) {
    let u: URL;
    try {
      u = new URL(id);
    } catch {
      throw new Error("Enter a YouTube video URL or 11-character ID.");
    }
    if (!["https:", "http:"].includes(u.protocol)) throw new Error("Enter a YouTube web URL.");
    const host = u.hostname.replace(/^(www\.|m\.)/, "");
    id =
      host === "youtu.be"
        ? u.pathname.slice(1)
        : host === "youtube.com"
          ? u.pathname === "/watch"
            ? (u.searchParams.get("v") ?? "")
            : (u.pathname.match(/^\/(?:shorts|live|embed)\/([\w-]{11})\/?$/)?.[1] ?? "")
          : "";
  }
  if (!/^[\w-]{11}$/.test(id)) throw new Error("Enter a valid YouTube video URL or ID.");
  return id;
}
export function queryFor(s: Source, v: Input): Parameters<FlashData["queries"]["realtime"]>[0] {
  const term = v.term.trim(),
    limit = countLimit(s),
    count = Number(v.count),
    language = v.language?.trim(),
    country = v.country?.trim();
  if (!term) throw new Error("Enter a search term, handle, or video ID.");
  if (limit && (!Number.isInteger(count) || count < 1 || count > limit))
    throw new Error(`Choose a result count from 1 to ${limit}.`);
  if (country && !/^[A-Za-z]{2}$/.test(country)) throw new Error("Use a two-letter country code.");
  switch (s) {
    case "youtube_search":
    case "youtube_search_extended":
      return { source: s, query: term, params: { max_results: count } };
    case "youtube_channel":
      return { source: s, handle: term, params: { video_limit: count } };
    case "youtube_captions":
    case "youtube_transcript":
      return {
        source: s,
        video_id: videoId(term),
        params: { auto: s === "youtube_transcript", ...(language ? { language } : {}) },
      };
    case "youtube_metadata":
      return { source: s, video_id: videoId(term), params: { include_chapters: true } };
    case "youtube_trainability":
      return { source: s, video_id: videoId(term) };
    case "youtube_suggestions":
      return {
        source: s,
        query: term,
        params: { ...(language ? { language } : {}), ...(country ? { region: country.toUpperCase() } : {}) },
      };
    default:
      return {
        source: s,
        query: term,
        params: {
          num: count,
          ...(country ? { gl: country.toLowerCase() } : {}),
          ...(language ? { hl: language } : {}),
        },
      };
  }
}
type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const text = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v) : "");
function url(v: unknown) {
  try {
    const u = new URL(text(v));
    return ["https:", "http:"].includes(u.protocol) ? u.href : undefined;
  } catch {
    return undefined;
  }
}
export type Row = { title: string; info?: string; body?: string; link?: string; image?: string; asset?: string };
export function resultRows(s: Source, payloads: unknown[]): Row[] {
  function hit(v: unknown): Row {
    const h = obj(v),
      link =
        url(h.link) ||
        url(h.website) ||
        (h.videoId ? `https://www.youtube.com/watch?v=${encodeURIComponent(text(h.videoId))}` : undefined);
    return {
      title: text(h.title) || text(h.name) || text(h.address) || "Result",
      info: [
        h.price,
        h.source,
        h.channel,
        h.durationString ?? h.duration,
        h.date,
        h.address,
        h.rating != null ? `Rating: ${h.rating}` : "",
      ]
        .map(text)
        .filter(Boolean)
        .join(" · "),
      body: text(h.snippet) || text(h.description) || text(h.category),
      link,
      image: s === "google_images" ? url(h.thumbnailUrl) : undefined,
      asset: s === "google_images" ? url(h.imageUrl) : undefined,
    };
  }
  return payloads.flatMap((p): Row[] => {
    const h = obj(p);
    if (s.startsWith("google_")) return list(h[s.slice(7)]).map(hit);
    switch (s) {
      case "youtube_search":
      case "youtube_search_extended":
        return list(h.results).map(hit);
      case "youtube_suggestions":
        return list(p)
          .filter((x): x is string => typeof x === "string")
          .map((title) => ({ title }));
      case "youtube_channel":
        return [
          {
            title: text(h.name) || "Channel",
            info: text(h.channelHandle),
            body: text(h.description),
            link: url(h.channelUrl),
          },
          ...list(h.videos).map(hit),
        ];
      case "youtube_metadata":
        return [
          hit(h),
          ...list(h.chapters).map((x) => ({
            title: text(obj(x).title) || "Chapter",
            info: text(obj(x).start_time ?? obj(x).start),
          })),
        ];
      case "youtube_captions":
      case "youtube_transcript":
        return [
          ...(text(h.fullText) ? [{ title: "Full Text", info: text(h.languageCode), body: text(h.fullText) }] : []),
          ...list(h.segments).map((x) => ({
            title: text(obj(x).text) || "Segment",
            info: `${text(obj(x).start)}–${text(obj(x).end)} s`,
          })),
        ];
      case "youtube_trainability":
        return [
          {
            title: list(h.permitted).map(text).join(", ") || "No label returned",
            info: text(h.videoId),
            body: "Reported license label only; not a grant of reuse or training rights.",
          },
        ];
      default:
        return [];
    }
  });
}

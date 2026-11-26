// ClearCaption API client (same request as the npm package "clearcaption"): runs on Apify, so it is not blocked by YouTube.
const API = "https://api.apify.com/v2/acts/clearcaption~youtube-transcript-translate/run-sync-get-dataset-items";

export type Segment = { text: string; start: number; duration: number };

type RawSeg = { text: string; start: number; dur: number };
type RawItem = {
  videoId?: string;
  input?: string;
  status: string;
  title?: string;
  segments?: RawSeg[];
  translation?: { segments?: RawSeg[] };
};

export type Transcript = { videoId: string; title?: string; segments: Segment[] };

export async function fetchTranscript(
  video: string,
  token: string,
  translateTo?: string,
  signal?: AbortSignal,
): Promise<Transcript> {
  const body: Record<string, unknown> = { videos: [video], outputFormats: ["segments"], includeTimestamps: true };
  if (translateTo) body.targetLanguage = translateTo;
  const r = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    signal,
  });
  if (!r.ok) throw new Error(`Apify HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const items = (await r.json()) as RawItem[];
  const it = items[0];
  if (!it) throw new Error("No result");
  if (it.status !== "OK") throw new Error(`No transcript: ${it.status}`);
  const raw = translateTo && it.translation?.segments?.length ? it.translation.segments : it.segments || [];
  return {
    videoId: it.videoId || it.input || video,
    title: it.title,
    segments: raw.map((s) => ({ text: s.text, start: s.start, duration: s.dur })),
  };
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

export function clock(sec: number): string {
  const s = Math.floor(sec);
  return s >= 3600
    ? `${Math.floor(s / 3600)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`
    : `${Math.floor(s / 60)}:${pad(s % 60)}`;
}

export function toSrt(segs: Segment[]): string {
  const t = (sec: number) => {
    const ms = Math.round(sec * 1000);
    return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`;
  };
  return segs.map((s, i) => `${i + 1}\n${t(s.start)} --> ${t(s.start + s.duration)}\n${s.text}\n`).join("\n");
}

export const toText = (segs: Segment[]) => segs.map((s) => s.text).join(" ");

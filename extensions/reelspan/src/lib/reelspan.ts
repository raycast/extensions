// Everything the commands and AI tools share, without Raycast imports (so it can be tested on its own).
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, extname, join } from "node:path";
import { Reelspan, type FileInput, type Json, type PostCommon } from "reelspan";

export const VERSION = "0.1.0";

export const NETWORKS: { id: string; name: string }[] = [
  ["tiktok", "TikTok"],
  ["youtube", "YouTube"],
  ["instagram", "Instagram"],
  ["facebook", "Facebook"],
  ["x", "X"],
  ["threads", "Threads"],
  ["linkedin", "LinkedIn"],
  ["pinterest", "Pinterest"],
  ["bluesky", "Bluesky"],
  ["reddit", "Reddit"],
  ["google_business", "Google Business"],
  ["telegram", "Telegram"],
  ["discord", "Discord"],
  ["slack", "Slack"],
  ["mastodon", "Mastodon"],
  ["nostr", "Nostr"],
  ["lemmy", "Lemmy"],
  ["devto", "Dev.to"],
  ["hashnode", "Hashnode"],
  ["wordpress", "WordPress"],
  ["whop", "Whop"],
  ["listmonk", "Listmonk"],
  ["sandbox", "Sandbox"],
].map(([id, name]) => ({ id, name }));

export const DASHBOARD_URL = "https://app.reelspan.com/dashboard";

export const networkName = (id: string) => NETWORKS.find((n) => n.id === id)?.name ?? id;

export const makeClient = (apiKey: string) =>
  new Reelspan({ apiKey, headers: { "x-reelspan-client": `raycast/${VERSION}` } });

export type ProfileRow = { username: string; name: string | null; networks: string[] };

export async function profiles(c: Reelspan): Promise<ProfileRow[]> {
  const r = await c.profiles.list();
  return r.profiles.map((p) => ({
    username: p.username,
    name: p.display_name,
    networks: Object.entries(p.social_accounts ?? {})
      .filter(([, v]) => v)
      .map(([k]) => k),
  }));
}

const MIME: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
};

/** `~` and `~/…` become the home folder, as a shell would expand them. */
export function expandHome(path: string, home = homedir()): string {
  if (path === "~") return home;
  return /^~[/\\]/.test(path) ? join(home, path.slice(2)) : path;
}

/** A URL is sent as is; a local path is read and uploaded. */
export async function toFile(pathOrUrl: string): Promise<FileInput> {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = expandHome(pathOrUrl.trim());
  return { data: await readFile(path), name: basename(path), type: MIME[extname(path).toLowerCase()] };
}

export type PostDraft = {
  profile: string;
  type: "text" | "video" | "photos";
  platforms: string[];
  text?: string;
  /** URLs or local paths */
  media?: string[];
  scheduledDate?: string | Date | null;
  timezone?: string;
  firstComment?: string;
  addToQueue?: boolean;
};

/** Checks a draft and says what is missing, in words a person can act on. */
export function problems(d: PostDraft): string[] {
  const out: string[] = [];
  if (!d.profile) out.push("Choose a profile.");
  if (!d.platforms?.length) out.push("Choose at least one network.");
  if (d.type === "text" && !d.text?.trim()) out.push("Write the text.");
  if (d.type !== "text" && !d.media?.length)
    out.push(d.type === "video" ? "Add a video file or URL." : "Add at least one photo.");
  if (d.type === "video" && (d.media?.length ?? 0) > 1) out.push("Only one video per post.");
  return out;
}

export async function publish(c: Reelspan, d: PostDraft, opts: { wait?: boolean; idempotencyKey?: string } = {}) {
  const bad = problems(d);
  if (bad.length) throw new Error(bad.join(" "));
  const when = d.scheduledDate
    ? d.scheduledDate instanceof Date
      ? d.scheduledDate.toISOString()
      : d.scheduledDate
    : undefined;
  const common: PostCommon = {
    user: d.profile,
    platforms: d.platforms,
    title: d.text?.trim() || undefined,
    scheduledDate: when,
    timezone: when ? d.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone : undefined,
    firstComment: d.firstComment?.trim() || undefined,
    addToQueue: d.addToQueue,
    async: opts.wait !== false,
    idempotencyKey: opts.idempotencyKey,
  };
  let r: Json;
  if (d.type === "video") r = await c.posts.video({ ...common, video: await toFile(d.media![0]) });
  else if (d.type === "photos")
    r = await c.posts.photos({ ...common, photos: await Promise.all(d.media!.map(toFile)) });
  else r = await c.posts.text(common);
  if (opts.wait !== false && r.request_id && !r.job_id && !(r.results && Object.keys(r.results).length))
    r = { request_id: r.request_id, ...(await c.posts.wait(r.request_id, { timeoutMs: 180_000 })) };
  return r;
}

export type ResultRow = { platform: string; ok: boolean | null; url?: string; error?: string };

/** One row per network from a post answer or a status answer. */
export function results(r: Json): ResultRow[] {
  const raw: Json[] = Array.isArray(r.results)
    ? r.results
    : Object.entries(r.results ?? {}).map(([platform, v]) => ({ platform, ...(v as object) }));
  return raw.map((x) => ({
    platform: x.platform,
    ok: x.success === true ? true : x.success === false && !x.skipped ? false : null,
    url: x.url ?? undefined,
    error: x.error ?? undefined,
  }));
}

/** "Posted to X and LinkedIn · failed on Bluesky", or "Scheduled for …". */
export function summary(r: Json): string {
  if (r.job_id && !r.results)
    return `Scheduled${r.scheduled_date ? ` for ${new Date(r.scheduled_date).toLocaleString()}` : ""}`;
  const rows = results(r);
  if (!rows.length) return "Sent to Reelspan";
  const ok = rows.filter((x) => x.ok).map((x) => networkName(x.platform));
  const bad = rows.filter((x) => x.ok === false).map((x) => networkName(x.platform));
  const wait = rows.filter((x) => x.ok === null).map((x) => networkName(x.platform));
  return [
    ok.length && `Posted to ${ok.join(", ")}`,
    bad.length && `failed on ${bad.join(", ")}`,
    wait.length && `still going on ${wait.join(", ")}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

export const errorMessage = (e: unknown) => {
  const err = e as { status?: number; message?: string };
  if (err?.status === 401) return "Reelspan refused the API key. Update it in the extension preferences.";
  return err?.message ?? String(e);
};

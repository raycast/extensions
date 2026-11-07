// Pure helpers: no Raycast APIs and no network, so they are easy to reason about and test.

export const API_BASE = "https://app.bulkpublish.com";
export const APP_URL = "https://app.bulkpublish.com";
export const WEBSITE_URL = "https://www.bulkpublish.com";
export const API_KEYS_URL = `${APP_URL}/developer`;

export type PostStatus = "draft" | "scheduled" | "publishing" | "published" | "processing" | "failed" | "partial";
export type DestinationStatus = "pending" | "publishing" | "published" | "failed" | "processing" | "unconfirmed";
export type ApprovalStatus = "none" | "pending" | "approved" | "rejected";

export interface Channel {
  id: number;
  platform: string;
  name: string;
  profileImage: string | null;
  tokenStatus: string | null;
  usable: boolean;
  /** Why the channel can't be posted to right now, in words for the user. */
  problem?: string;
  /** Something the user should know about, though the channel still works. */
  warning?: string;
}

export interface Destination {
  id: number;
  channelId: number;
  platform: string;
  status: DestinationStatus | string;
  url: string | null;
  error: string | null;
}

export interface MediaFile {
  id: number;
  fileName: string;
  mimeType: string;
  previewUrl: string | null;
  originalUrl: string | null;
}

export interface Label {
  id: number;
  name: string;
  color: string;
}

export interface Post {
  id: number;
  content: string;
  status: PostStatus | string;
  approvalStatus: ApprovalStatus | string;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  timezone: string | null;
  destinations: Destination[];
  media: MediaFile[];
  labels: Label[];
  rejectionReason: string | null;
}

export type MediaKind = "image" | "video" | null;

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

// ── Parsing API responses ──

export function parseChannel(raw: unknown): Channel | null {
  if (!isRecord(raw)) return null;
  const id = Number(raw.id);
  if (!Number.isInteger(id) || typeof raw.platform !== "string") return null;
  const name = str(raw.accountName) ?? str(raw.name) ?? `#${id}`;
  let problem: string | undefined;
  if (raw.isActive === false) problem = "Turned off in BulkPublish";
  else if (raw.needsReconnect === true || raw.tokenStatus === "expired") problem = "Needs reconnecting";
  else if (raw.platformAvailable === false) problem = str(raw.platformMessage) ?? "Can't be posted to right now";
  let warning: string | undefined;
  if (!problem && raw.tokenStatus === "expiring_soon" && raw.autoRenews === false) warning = "Connection expires soon";
  return {
    id,
    platform: raw.platform,
    name,
    profileImage: str(raw.profileImage),
    tokenStatus: str(raw.tokenStatus),
    usable: !problem,
    problem,
    warning,
  };
}

export function parsePost(raw: unknown): Post | null {
  if (!isRecord(raw)) return null;
  const id = Number(raw.id);
  if (!Number.isInteger(id)) return null;
  const list = (v: unknown) => (Array.isArray(v) ? v.filter(isRecord) : []);
  return {
    id,
    content: typeof raw.content === "string" ? raw.content : "",
    status: str(raw.status) ?? "unknown",
    approvalStatus: str(raw.approvalStatus) ?? "none",
    scheduledAt: str(raw.scheduledAt),
    publishedAt: str(raw.publishedAt),
    createdAt: str(raw.createdAt),
    updatedAt: str(raw.updatedAt),
    timezone: str(raw.timezone),
    rejectionReason: str(raw.rejectionReason),
    destinations: list(raw.postPlatforms).map((d) => ({
      id: Number(d.id),
      channelId: Number(d.channelId),
      platform: String(d.platform ?? ""),
      status: String(d.status ?? ""),
      url: str(d.platformUrl),
      error: str(d.errorMessage),
    })),
    media: list(raw.mediaFiles).map((m) => ({
      id: Number(m.id),
      fileName: String(m.fileName ?? ""),
      mimeType: String(m.mimeType ?? ""),
      previewUrl: str(m.previewUrl) ?? str(m.thumbnailUrl),
      originalUrl: str(m.originalUrl),
    })),
    labels: list(raw.labels).map((l) => ({
      id: Number(l.id),
      name: String(l.name ?? ""),
      color: String(l.color ?? ""),
    })),
  };
}

// ── Text ──

export function firstLine(s: string, max = 80): string {
  const line =
    s
      .split("\n")
      .map((l) => l.trim())
      .find(Boolean) ?? "";
  return truncate(line, max);
}

export function truncate(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if ([...t].length <= max) return t;
  const cut = [...t].slice(0, max - 1).join("");
  const space = cut.lastIndexOf(" ");
  return (space >= max * 0.5 ? cut.slice(0, space) : cut).trimEnd() + "…";
}

/** Caption limits checked before sending, so one network can't reject the whole post. */
export const CHAR_LIMITS: Record<string, number> = {
  x: 280,
  bluesky: 300,
  threads: 500,
  mastodon: 500,
  pinterest: 500,
  snapchat: 160,
  gmb: 1500,
  discord: 2000,
  instagram: 2200,
  tiktok: 2200,
  linkedin: 3000,
  telegram: 4096,
};

const URL_RE = /https?:\/\/\S+/g;

/** Length as the network counts it: X and Mastodon count every link as 23 characters. */
export function platformLength(text: string, platform: string): number {
  const n = [...text].length;
  if (platform !== "x" && platform !== "mastodon") return n;
  let len = n;
  for (const m of text.match(URL_RE) ?? []) len += 23 - [...m].length;
  return len;
}

export interface Count {
  platform: string;
  length: number;
  limit: number;
  over: boolean;
}

/** One counter per network that has a limit, among the chosen channels. */
export function countsFor(text: string, platforms: string[]): Count[] {
  return [...new Set(platforms)]
    .filter((p) => CHAR_LIMITS[p] !== undefined)
    .sort((a, b) => CHAR_LIMITS[a] - CHAR_LIMITS[b])
    .map((p) => {
      const limit = CHAR_LIMITS[p];
      const length = platformLength(text, p);
      return { platform: p, length, limit, over: length > limit };
    });
}

// ── Networks ──

const PLATFORM_NAMES: Record<string, string> = {
  x: "X",
  gmb: "Google Business",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  youtube: "YouTube",
};

export function platformLabel(p: string): string {
  return PLATFORM_NAMES[p] ?? p.charAt(0).toUpperCase() + p.slice(1);
}

/** What media each network needs. Networks not listed can take text alone. */
const MEDIA_RULES: Record<string, ("image" | "video")[]> = {
  instagram: ["image", "video"],
  pinterest: ["image", "video"],
  snapchat: ["image", "video"],
  tiktok: ["video"],
  youtube: ["video"],
};

/** Post type to request when the network's default post type doesn't take the attachment. */
const POST_TYPE_FOR: Record<"image" | "video", Record<string, string>> = {
  image: { threads: "image" },
  video: { instagram: "reel", pinterest: "video_pin" },
};

export function mediaNeedFor(platform: string): string | null {
  const need = MEDIA_RULES[platform];
  if (!need) return null;
  return need.length > 1 ? "needs an image or a video" : `needs ${need[0] === "image" ? "an image" : "a video"}`;
}

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

export function mimeFromName(name: string): string | null {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return MIME[ext] ?? null;
}

export function mediaKindOf(mimeType: string | null | undefined): MediaKind {
  if (!mimeType) return null;
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return null;
}

export interface Skipped {
  channel: Channel;
  reason: string;
}

/** Decide which chosen channels can take this post, and why the rest can't. */
export function planTargets(channels: Channel[], ids: number[], media: MediaKind) {
  const byId = new Map(channels.map((c) => [c.id, c]));
  const targets: Channel[] = [];
  const skipped: Skipped[] = [];
  for (const id of ids) {
    const c = byId.get(id);
    if (!c) continue;
    if (!c.usable) {
      skipped.push({ channel: c, reason: (c.problem ?? "can't be used").toLowerCase() });
      continue;
    }
    const need = MEDIA_RULES[c.platform];
    if (need && !(media && need.includes(media))) {
      skipped.push({ channel: c, reason: mediaNeedFor(c.platform) ?? "needs media" });
      continue;
    }
    targets.push(c);
  }
  return { targets, skipped };
}

export interface PostBody {
  content: string;
  status: "draft" | "scheduled";
  channels: { channelId: number; platform: string }[];
  scheduledAt?: string;
  timezone?: string;
  mediaFiles?: number[];
  postTypeOverrides?: Record<string, string>;
}

/** Body for POST /api/posts. */
export function buildPostBody(
  targets: Channel[],
  content: string,
  mediaIds: number[],
  media: MediaKind,
  schedule?: { scheduledAt: string; timezone: string },
): PostBody {
  const postTypeOverrides: Record<string, string> = {};
  if (mediaIds.length && media) {
    for (const t of targets) {
      const type = POST_TYPE_FOR[media][t.platform];
      if (type) postTypeOverrides[t.platform] = type;
    }
  }
  return {
    content,
    status: schedule ? "scheduled" : "draft",
    channels: targets.map((t) => ({ channelId: t.id, platform: t.platform })),
    ...(schedule ?? {}),
    ...(mediaIds.length ? { mediaFiles: mediaIds } : {}),
    ...(Object.keys(postTypeOverrides).length ? { postTypeOverrides } : {}),
  };
}

// ── Errors ──

/** Turn an API error body into one sentence the user can act on. */
export function apiErrorMessage(status: number, body: unknown): string {
  let msg = "";
  let code = "";
  if (isRecord(body)) {
    if (typeof body.error === "string") msg = body.error;
    else if (isRecord(body.error)) {
      if (typeof body.error.message === "string") msg = body.error.message;
      if (typeof body.error.hint === "string") msg += ` ${body.error.hint}`;
      if (typeof body.error.code === "string") code = body.error.code;
    } else if (typeof body.message === "string") msg = body.message;
  }
  if (status === 401) return "BulkPublish didn't accept your API key. Check it in the extension preferences.";
  if (code === "APPROVAL_REQUIRED")
    return "Your role needs a teammate's approval to publish. Schedule the post and ask for approval in BulkPublish.";
  if (status === 403 && !msg) return "Your API key isn't allowed to do that.";
  if ((status === 402 || status === 429) && !msg) return "You've reached a limit on your BulkPublish plan.";
  if (status >= 500) return "BulkPublish is having trouble right now. Try again in a few minutes.";
  return msg.trim() || `BulkPublish returned an error (${status}).`;
}

// ── Links ──

export const postEditUrl = (id: number) => `${APP_URL}/compose?edit=${id}`;
export const repostUrl = (id: number) => `${APP_URL}/compose?repost=${id}`;

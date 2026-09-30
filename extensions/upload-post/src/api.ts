import { getPreferenceValues } from "@raycast/api";
import { openAsBlob } from "node:fs";
import { access } from "node:fs/promises";
import { basename } from "node:path";

export const API_BASE_URL = "https://api.upload-post.com/api";
export const APP_URL = "https://app.upload-post.com";

export type PostType = "text" | "photo" | "video";

/** Platforms each endpoint accepts, as documented. Reddit is left out: posting is currently unavailable. */
export const PLATFORMS_BY_TYPE: Record<PostType, string[]> = {
  text: [
    "x",
    "linkedin",
    "facebook",
    "threads",
    "bluesky",
    "discord",
    "telegram",
    "google_business",
    "slack",
    "mastodon",
    "nostr",
    "lemmy",
    "devto",
    "hashnode",
    "wordpress",
    "whop",
    "listmonk",
  ],
  photo: [
    "tiktok",
    "instagram",
    "linkedin",
    "facebook",
    "x",
    "threads",
    "pinterest",
    "bluesky",
    "discord",
    "telegram",
    "google_business",
    "mastodon",
    "lemmy",
    "wordpress",
  ],
  video: [
    "tiktok",
    "instagram",
    "youtube",
    "linkedin",
    "facebook",
    "x",
    "threads",
    "pinterest",
    "bluesky",
    "discord",
    "telegram",
    "google_business",
    "mastodon",
    "wordpress",
  ],
};

export const UNAVAILABLE_PLATFORMS = ["reddit"];

const PLATFORM_NAMES: Record<string, string> = {
  x: "X",
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  threads: "Threads",
  pinterest: "Pinterest",
  bluesky: "Bluesky",
  reddit: "Reddit",
  discord: "Discord",
  telegram: "Telegram",
  google_business: "Google Business",
  slack: "Slack",
  mastodon: "Mastodon",
  nostr: "Nostr",
  lemmy: "Lemmy",
  devto: "DEV",
  hashnode: "Hashnode",
  wordpress: "WordPress",
  whop: "Whop",
  listmonk: "Listmonk",
  snapchat: "Snapchat",
};

export function platformName(platform: string): string {
  return PLATFORM_NAMES[platform] ?? platform.charAt(0).toUpperCase() + platform.slice(1);
}

// ---------- Types ----------

export interface SocialAccount {
  username?: string;
  handle?: string;
  display_name?: string;
  social_images?: string;
  reauth_required?: boolean;
  capabilities?: string[];
}

export interface Profile {
  username: string;
  created_at?: string;
  social_accounts?: Record<string, SocialAccount | string | null>;
}

export interface ProfilesResponse {
  success?: boolean;
  plan?: string;
  limit?: number;
  profiles: Profile[];
}

export interface ScheduledPost {
  job_id: string;
  scheduled_date: string;
  post_type?: "video" | "photo" | "text" | "unknown";
  profile_username?: string;
  title?: string;
  caption?: string;
  description?: string;
  external_id?: string | null;
  source_filename?: string | null;
  platforms?: string[];
  thumbnail_url?: string | null;
  original_timezone?: string | null;
}

export interface ScheduledPostsResponse {
  scheduled_posts: ScheduledPost[];
  total?: number;
  limit?: number | null;
  offset?: number;
}

export interface HistoryItem {
  profile_username?: string;
  platform: string;
  media_type?: "video" | "photo" | "text";
  upload_timestamp?: string;
  success?: boolean;
  post_url?: string | null;
  error_message?: string | null;
  post_title?: string | null;
  post_caption?: string | null;
  job_id?: string | null;
  request_id?: string | null;
  external_id?: string | null;
  fallback_to_inbox?: boolean;
}

export interface HistoryResponse {
  history: HistoryItem[];
  in_progress?: HistoryItem[];
  total?: number;
  page?: number;
  limit?: number;
}

export interface PlatformResult {
  platform?: string;
  success?: boolean;
  status?: string;
  message?: string;
  error?: string;
  post_url?: string | null;
  url?: string | null;
  upload_timestamp?: string;
  skipped?: boolean;
  fallback_to_inbox?: boolean;
}

export interface StatusResponse {
  request_id?: string;
  job_id?: string;
  status: string;
  message?: string;
  completed?: number;
  total?: number;
  results?: PlatformResult[];
  last_update?: string;
}

export interface UploadResponse {
  success?: boolean;
  message?: string;
  request_id?: string;
  job_id?: string;
  scheduled_date?: string;
  queue_slot?: string;
  total_platforms?: number;
  results?: Record<string, PlatformResult>;
  warnings?: string[];
  error?: string;
}

// ---------- HTTP ----------

export class UploadPostError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "UploadPostError";
  }
}

function authHeaders(): Record<string, string> {
  const { apiKey } = getPreferenceValues<Preferences>();
  return { Authorization: `Apikey ${apiKey.trim()}` };
}

function errorMessage(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    for (const key of ["message", "error", "detail"]) {
      if (typeof b[key] === "string" && b[key]) return b[key] as string;
    }
  }
  if (status === 401) return "Invalid API key. Check it in the extension preferences.";
  return `Upload-Post API error (HTTP ${status})`;
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers as Record<string, string> | undefined) },
  });
  const text = await response.text();
  let body: unknown = undefined;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = undefined;
  }
  if (!response.ok) {
    throw new UploadPostError(errorMessage(body, response.status), response.status);
  }
  return body as T;
}

function query(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

// ---------- Profiles ----------

export async function getProfiles(): Promise<ProfilesResponse> {
  const data = await request<ProfilesResponse>("/uploadposts/users");
  return { ...data, profiles: data.profiles ?? [] };
}

export interface ConnectedAccount {
  platform: string;
  account?: SocialAccount;
  reauthRequired: boolean;
}

/** Accounts actually connected to the profile (an empty string or null means "added but not connected"). */
export function connectedAccounts(profile: Profile): ConnectedAccount[] {
  return Object.entries(profile.social_accounts ?? {})
    .filter(([, value]) => Boolean(value))
    .map(([platform, value]) => {
      const account = typeof value === "object" && value !== null ? value : undefined;
      return { platform, account, reauthRequired: Boolean(account?.reauth_required) };
    })
    .sort((a, b) => platformName(a.platform).localeCompare(platformName(b.platform)));
}

export function accountLabel(account?: SocialAccount): string | undefined {
  if (!account) return undefined;
  if (account.handle) return account.handle.startsWith("@") ? account.handle : `@${account.handle}`;
  return account.display_name || undefined;
}

// ---------- Scheduled posts ----------

export async function getScheduledPosts(
  params: { profile?: string; from?: string; to?: string; limit?: number; offset?: number } = {},
): Promise<ScheduledPostsResponse> {
  const data = await request<ScheduledPostsResponse | ScheduledPost[]>(
    `/uploadposts/schedule${query({
      profile_username: params.profile,
      from: params.from,
      to: params.to,
      limit: params.limit,
      offset: params.offset,
    })}`,
  );
  // Older API versions returned a bare array.
  if (Array.isArray(data)) return { scheduled_posts: data, total: data.length };
  return { ...data, scheduled_posts: data.scheduled_posts ?? [] };
}

export async function cancelScheduledPost(
  jobId: string,
): Promise<{ success: boolean; message?: string; credits_refunded?: number }> {
  return request(`/uploadposts/schedule/${encodeURIComponent(jobId)}`, { method: "DELETE" });
}

// ---------- History & status ----------

export const HISTORY_PAGE_SIZES = [10, 20, 50, 100] as const;

export async function getUploadHistory(
  params: {
    page?: number;
    limit?: (typeof HISTORY_PAGE_SIZES)[number];
    profile?: string;
    platform?: string;
    status?: "success" | "failed";
    start?: string;
    end?: string;
    requestId?: string;
    jobId?: string;
  } = {},
): Promise<HistoryResponse> {
  const data = await request<HistoryResponse>(
    `/uploadposts/history${query({
      page: params.page ?? 1,
      limit: params.limit ?? 50,
      profile_username: params.profile,
      platform: params.platform,
      status: params.status,
      start: params.start,
      end: params.end,
      request_id: params.requestId,
      job_id: params.jobId,
    })}`,
  );
  return { ...data, history: data.history ?? [] };
}

export async function getUploadStatus(id: { requestId?: string; jobId?: string }): Promise<StatusResponse> {
  if (!id.requestId && !id.jobId) throw new UploadPostError("A request_id or job_id is required");
  try {
    return await request<StatusResponse>(`/uploadposts/status${query({ request_id: id.requestId, job_id: id.jobId })}`);
  } catch (error) {
    if (error instanceof UploadPostError && error.status === 404) {
      return { ...id, status: "not_found", message: "No upload request found with this ID" };
    }
    throw error;
  }
}

// ---------- Publishing ----------

export interface CreatePostInput {
  profile: string;
  platforms: string[];
  type: PostType;
  /** Post text / caption (sent as `title`). */
  title: string;
  /** Extended text (sent as `description`) for photo and video posts. */
  description?: string;
  /** Local file paths or http(s) URLs. One for video, one or more for photos. */
  media?: string[];
  /** ISO-8601 date. */
  scheduledDate?: string;
  /** IANA timezone used to interpret `scheduledDate`. */
  timezone?: string;
  addToQueue?: boolean;
  firstComment?: string;
}

export function isUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

async function appendMedia(form: FormData, field: string, item: string) {
  const value = item.trim();
  if (isUrl(value)) {
    form.append(field, value);
    return;
  }
  try {
    await access(value);
  } catch {
    throw new UploadPostError(`File not found: ${value}`);
  }
  form.append(field, await openAsBlob(value), basename(value));
}

const ENDPOINT_BY_TYPE: Record<PostType, string> = {
  text: "/upload_text",
  photo: "/upload_photos",
  video: "/upload",
};

export async function createPost(input: CreatePostInput): Promise<UploadResponse> {
  const platforms = input.platforms.filter((p) => !UNAVAILABLE_PLATFORMS.includes(p));
  if (platforms.length === 0) throw new UploadPostError("Select at least one platform");
  const unsupported = platforms.filter((p) => !PLATFORMS_BY_TYPE[input.type].includes(p));
  if (unsupported.length > 0) {
    throw new UploadPostError(
      `${unsupported.map(platformName).join(", ")} can't publish ${input.type} posts. Pick a different post type or platform.`,
    );
  }
  if (input.scheduledDate && input.addToQueue) {
    throw new UploadPostError("Choose either a scheduled date or the queue, not both");
  }
  const media = (input.media ?? []).map((m) => m.trim()).filter(Boolean);
  if (input.type === "video" && media.length !== 1) throw new UploadPostError("A video post needs exactly one video");
  if (input.type === "photo" && media.length === 0) throw new UploadPostError("A photo post needs at least one photo");
  if (input.type === "text" && !input.title.trim()) throw new UploadPostError("A text post needs some text");

  const form = new FormData();
  form.append("user", input.profile);
  for (const platform of platforms) form.append("platform[]", platform);
  form.append("title", input.title);
  if (input.description && input.type !== "text") form.append("description", input.description);
  if (input.firstComment) form.append("first_comment", input.firstComment);

  if (input.addToQueue) {
    form.append("add_to_queue", "true");
  } else if (input.scheduledDate) {
    form.append("scheduled_date", input.scheduledDate);
    if (input.timezone) form.append("timezone", input.timezone);
  } else {
    // Return a request_id straight away instead of waiting for every network to finish.
    form.append("async_upload", "true");
  }

  if (input.type === "video") await appendMedia(form, "video", media[0]);
  if (input.type === "photo") for (const item of media) await appendMedia(form, "photos[]", item);

  return request<UploadResponse>(ENDPOINT_BY_TYPE[input.type], { method: "POST", body: form });
}

// ---------- URLs ----------

export const urls = {
  apiKeys: `${APP_URL}/api-keys`,
  manageProfiles: `${APP_URL}/manage-users`,
  scheduledPosts: `${APP_URL}/scheduled-posts`,
  uploadHistory: `${APP_URL}/upload-history`,
  calendar: `${APP_URL}/calendar`,
};

/** A post URL is only useful when it is an actual link (TikTok inbox drafts return a sentence instead). */
export function postUrl(item: { post_url?: string | null; url?: string | null }): string | undefined {
  const value = item.post_url || item.url;
  return value && isUrl(value) ? value : undefined;
}

/**
 * Parses a list sent by Raycast AI as a string: a JSON array (`["x","linkedin"]`) or values separated by
 * `separator` (commas and new lines by default). Tools take strings because array inputs are not supported.
 */
export function parseList(value: string | undefined, separator: RegExp = /[,\n]/): string[] {
  const text = (value ?? "").trim();
  if (!text) return [];
  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean);
    } catch {
      // Not JSON, fall back to splitting.
    }
  }
  return text
    .split(separator)
    .map((v) => v.trim())
    .filter(Boolean);
}

/** The API returns UTC dates, sometimes without an offset ("2027-07-26T22:46:00.282000"). Read them as UTC. */
export function parseApiDate(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const iso = /^\d{4}-\d{2}-\d{2}T[\d:.]+$/.test(value) ? `${value}Z` : value;
  const date = new Date(iso);
  return isNaN(date.getTime()) ? undefined : date;
}

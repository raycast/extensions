import { getPreferenceValues } from "@raycast/api";

const BASE = "https://shapelessai.com";

export type Connection = {
  id: string;
  platform: string;
  handle: string;
  displayName?: string | null;
  mode: string;
  status: string;
};

export type Post = {
  id: string;
  connectionId: string;
  platform: string;
  status: string;
  postText: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  publishedLocation: string | null;
  error: string | null;
};

export type NewPost = {
  connectionId: string;
  postText: string;
  scheduledAt?: string;
  publishNow?: boolean;
};

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { apiKey } = getPreferenceValues<Preferences>();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (res.status === 401)
    throw new Error(
      "The API key was refused. Make a new one at shapelessai.com/docs/api.",
    );
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok)
    throw new Error(body.error || `ShapelessAI answered ${res.status}`);
  return body;
}

export const accountLabel = (c: Connection) =>
  `${c.displayName || c.handle} (${c.platform})`;

// Tracked-only and paused accounts cannot be posted to, so they never reach a picker.
export async function listConnections(): Promise<Connection[]> {
  const { connections } = await call<{ connections: Connection[] }>(
    "/api/connections",
  );
  return connections.filter((c) => c.mode === "oauth" && c.status === "active");
}

export async function listPosts(status?: string, limit = 50): Promise<Post[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    ...(status ? { status } : {}),
  });
  const { posts } = await call<{ posts: Post[] }>(`/api/posts?${params}`);
  return posts;
}

// No time and no "now" means the account's next free queue slot, so nothing posts at an odd hour by accident.
export async function createPost({
  connectionId,
  postText,
  scheduledAt,
  publishNow,
}: NewPost): Promise<Post> {
  const body: Record<string, unknown> = { connectionId, postText };
  if (scheduledAt) body.scheduledAt = scheduledAt;
  else if (!publishNow) body.queue = true;
  const res = await call<{ post?: Post } & Post>("/api/posts", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return res.post || res;
}

/** A set time that is not in the future would publish at once, so it is refused before anything is sent. */
export function pastTimeError(scheduledAt?: string | Date | null) {
  if (!scheduledAt) return undefined;
  const t = new Date(scheduledAt).getTime();
  if (Number.isNaN(t)) return "That time is not a valid date";
  return t <= Date.now() ? "Pick a time in the future" : undefined;
}

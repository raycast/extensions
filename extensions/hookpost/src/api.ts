import { getPreferenceValues } from "@raycast/api";

export const APP_URL = "https://hookpost.hookstep.in";
const API_URL = `${APP_URL}/api/public/v1`;

export type Channel = {
  id: string;
  name: string;
  identifier: string;
  picture?: string;
  disabled?: boolean;
};

export type PostState = "QUEUE" | "PUBLISHED" | "ERROR" | "DRAFT";

export type Post = {
  id: string;
  content: string;
  publishDate: string;
  state: PostState;
  releaseURL?: string | null;
  error?: string | null;
  integration: {
    id: string;
    name: string;
    providerIdentifier: string;
    picture?: string;
  };
};

export type CreatedPost = { postId: string; integration: string };

async function request<T>(method: "GET" | "POST" | "DELETE", path: string, body?: unknown): Promise<T> {
  const { apiKey } = getPreferenceValues<Preferences>();
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      // The public API takes the key as the whole Authorization header, with no "Bearer" prefix.
      Authorization: apiKey.trim(),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data: unknown = undefined;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(errorMessage(response.status, data));
  }
  return data as T;
}

function errorMessage(status: number, data: unknown): string {
  if (status === 401) {
    return "Hookpost rejected the API key. Check it in the extension preferences.";
  }
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    const message = record.msg ?? record.message ?? record.error;
    if (typeof message === "string") return message;
    if (Array.isArray(message)) return message.join(", ");
  }
  if (typeof data === "string" && data.length < 200) return data;
  return `Hookpost API error (HTTP ${status})`;
}

export function listChannels(): Promise<Channel[]> {
  return request<Channel[]>("GET", "/integrations");
}

export async function listPosts(startDate: Date, endDate: Date): Promise<Post[]> {
  const query = new URLSearchParams({ startDate: startDate.toISOString(), endDate: endDate.toISOString() });
  const result = await request<{ posts: Post[] }>("GET", `/posts?${query.toString()}`);
  return result?.posts ?? [];
}

export function createDraft(channelIds: string[], text: string): Promise<CreatedPost[]> {
  const content = textToHtml(text);
  return request<CreatedPost[]>("POST", "/posts", {
    type: "draft",
    date: new Date().toISOString(),
    shortLink: false,
    tags: [],
    posts: channelIds.map((id) => ({
      integration: { id },
      value: [{ content, image: [] }],
    })),
  });
}

export function deletePost(postId: string): Promise<unknown> {
  return request("DELETE", `/posts/${encodeURIComponent(postId)}`);
}

const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Hookpost stores post content as HTML with one <p> per line, the same as its editor. */
export function textToHtml(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}

/** Turns stored post HTML back into plain text for display and copying. */
export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|h[1-6]|blockquote|pre)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

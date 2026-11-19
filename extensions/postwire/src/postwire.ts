// The PostWire API (https://postwire.io/docs). Nothing here imports Raycast, so it runs in plain Node tests.
export const SITE = "https://postwire.io";

export type Network = { platform: string; needs: "text" | "photo_or_video" | "video" };
export type ApiResult = { code: number; body: Record<string, unknown> };
type Row = Record<string, unknown>;

export const link = (where: string) => `${SITE}/dashboard.html?from=raycast_${where}`;

export async function call(key: string, method: "GET" | "POST", path: string, body?: unknown): Promise<ApiResult> {
  try {
    const res = await fetch(SITE + path, {
      method,
      headers: {
        Authorization: `Bearer ${key.trim()}`,
        "Content-Type": "application/json",
        "X-PostWire-Source": "raycast",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    let data: Record<string, unknown> = {};
    try {
      data = ((await res.json()) as Record<string, unknown>) || {};
    } catch {
      data = {};
    }
    return { code: res.status, body: data };
  } catch {
    return { code: 0, body: {} };
  }
}

const NAMES: Record<string, string> = {
  linkedin: "LinkedIn",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  bluesky: "Bluesky",
  mastodon: "Mastodon",
  telegram: "Telegram",
  discord: "Discord",
  slack: "Slack",
  nostr: "Nostr",
  threads: "Threads",
  x: "X",
  twitter: "X",
  pinterest: "Pinterest",
  wordpress: "WordPress",
  devto: "Dev.to",
  hashnode: "Hashnode",
};
export const nameOf = (p: string) => NAMES[p] || p.charAt(0).toUpperCase() + p.slice(1);

// One entry per network, in the order the account connected them.
export function networksOf(body: Record<string, unknown>): Network[] {
  const list: Row[] = Array.isArray(body.connections) ? body.connections : [];
  const seen = new Map<string, Network>();
  for (const c of list) {
    if (!c || typeof c.platform !== "string" || seen.has(c.platform)) continue;
    const needs = c.needs === "video" || c.needs === "photo_or_video" ? c.needs : "text";
    seen.set(c.platform, { platform: c.platform, needs });
  }
  return [...seen.values()];
}

export type Media = { kind: "none" | "photo" | "video"; url: string };

// An https:// link ending in a video extension is a video; any other https:// link is a picture. http:// is refused, as the form says.
export function mediaOf(raw: string): Media {
  const url = raw.trim();
  if (!/^https:\/\/\S+$/i.test(url)) return { kind: "none", url: "" };
  const path = url.split(/[?#]/)[0].toLowerCase();
  return { kind: /\.(mp4|mov|m4v|webm)$/.test(path) ? "video" : "photo", url };
}

// Why a network cannot take this post, or "" when it can.
export function blocker(n: Network, media: Media): string {
  if (n.needs === "video" && media.kind !== "video") return "needs a video link";
  if (n.needs === "photo_or_video" && media.kind === "none") return "needs a picture or video link";
  return "";
}

export function postBody(text: string, platforms: string[], media: Media): Record<string, unknown> {
  const body: Record<string, unknown> = { platforms, text: text.trim() };
  if (media.kind === "photo") body.photo_url = media.url;
  if (media.kind === "video") body.video_url = media.url;
  return body;
}

export type Outcome = { ok: boolean; title: string; message: string; url: string };

// Reads PostWire's answer to POST /api/post.
export function outcomeOf(res: ApiResult): Outcome {
  const b = res.body;
  const results: Row[] = (Array.isArray(b.results) ? (b.results as Row[]) : []).filter(
    (r) => r && typeof r.platform === "string",
  );
  const good = results.filter((r) => r.ok);
  const bad = results.filter((r) => !r.ok);
  const said = [b.held_message, b.upgrade_message, b.message_for_user, b.error].find(
    (m) => typeof m === "string" && m,
  ) as string | undefined;
  const why = bad.map((r) => `${nameOf(String(r.platform))}: ${String(r.error || "not posted").slice(0, 120)}`);
  if (good.length) {
    const linked = good.find((r) => typeof r.url === "string" && /^https?:\/\//.test(r.url as string));
    return {
      ok: true,
      title: `Posted to ${good.map((r) => nameOf(String(r.platform))).join(", ")}`,
      message: [...why, typeof b.held_message === "string" ? b.held_message : ""].filter(Boolean).join(" · "),
      url: linked ? String(linked.url) : link("published"),
    };
  }
  if (res.code === 401) return { ok: false, title: "PostWire did not accept the API key", message: "", url: "" };
  if (res.code === 0) return { ok: false, title: "Could not reach PostWire", message: "", url: "" };
  return {
    ok: false,
    title: "Not posted",
    message: why.join(" · ") || said || `PostWire answered ${res.code}`,
    url: "",
  };
}

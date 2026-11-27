import type { Account, CreatePostBody, Post } from "./api";

export function accountLabel(a: Account) {
  const network = a.network_name ?? a.network;
  const handle = a.handle ? ` (${a.handle})` : "";
  const status = a.status && a.status !== "active" ? ` [${a.status}]` : "";
  return `${network}: ${a.name}${handle}${status}`;
}

export const firstLine = (text = "", max = 80) => {
  const line =
    text
      .split("\n")
      .find((l) => l.trim())
      ?.trim() ?? "";
  return line.length > max ? `${line.slice(0, max - 1)}…` : line || "(no text)";
};

/** Posts still to come, soonest first. */
export const soonestFirst = (posts: Post[]) =>
  [...posts].sort((a, b) => Date.parse(a.scheduled_at ?? "") - Date.parse(b.scheduled_at ?? ""));

export const postErrors = (p: Post) =>
  (p.accounts ?? []).filter((a) => a.error).map((a) => `${a.name ?? a.network}: ${a.error}`);

export const MIN_LEAD_MS = 5 * 60_000;

export type PostForm = { text: string; accountIds: string[]; when: string; publishAt: Date | null; mediaUrl: string };

/** Turns the form into the API body, or says what to fix. Media links are uploaded first by the caller. */
export function buildPostBody(
  v: PostForm,
  mediaIds: string[],
  now = Date.now(),
): { body?: CreatePostBody; error?: string } {
  const text = v.text.trim();
  if (!text && !mediaIds.length) return { error: "Write some text or add an image or video link." };
  const body: CreatePostBody = { text, account_ids: v.accountIds, media_ids: mediaIds };
  if (v.when === "schedule") {
    if (!v.accountIds.length) return { error: "Choose at least one account to schedule the post." };
    if (!v.publishAt) return { error: "Choose when to publish." };
    if (v.publishAt.getTime() < now + MIN_LEAD_MS) return { error: "Pick a time at least 5 minutes from now." };
    body.schedule_at = v.publishAt.toISOString();
  } else {
    body.draft = true;
  }
  return { body };
}

export function validMediaUrl(raw: string) {
  const v = raw.trim();
  if (!v) return true;
  try {
    return new URL(v).protocol === "https:";
  } catch {
    return false;
  }
}

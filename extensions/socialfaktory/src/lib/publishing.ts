import { createHash, randomUUID } from "node:crypto";
import { McpToolError, type CallOptions } from "./mcp";
import type { Channel, Post } from "./types";
import { mayStillBeRunning } from "./writing";

export const PENDING_POST_PREFIX = "pending-post-";
export const PENDING_POST_TTL_MS = 23 * 60 * 60 * 1000;
export const MIN_LEAD_MS = 2 * 60 * 1000;
export const PAST_TIME = "Pick a time at least two minutes from now.";
export const SENDING_STALE_MS = 11 * 60 * 1000;
export const ALREADY_SENDING = "This post is already being sent. Check Scheduled Posts in a moment.";

const OFFSET_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/i;

export type PublishDependencies = {
  call<T>(name: string, args: Record<string, unknown>, options?: CallOptions): Promise<T>;
  now(): number;
  lock<T>(name: string, work: () => Promise<T>): Promise<T>;
  account(): Promise<string>;
  storage: {
    allItems(): Promise<Record<string, string>>;
    getItem(key: string): Promise<string | undefined>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  };
};

export type Publication = {
  brandId: string;
  channel: Channel;
  parts: string[];
  scheduledAt?: Date;
};

type Attempt = { key: string; at: number; postId?: string; sending?: number };

type Target = { channel_id: string; caption: string } | { channel_id: string; parts: string[] };

export function needsSignInForPublishing(error: unknown): boolean {
  return error instanceof McpToolError && error.kind === "scope_required";
}

export function connectedChannels(channels: Channel[], platform: string): Channel[] {
  return channels.filter((channel) => channel.provider === platform && channel.status === "connected");
}

export type ChannelPick = { channel: Channel } | { problem: "none" | "choose"; choices: Channel[] };

export function pickChannel(channels: Channel[], channelId?: string): ChannelPick {
  const asked = channelId ? channels.find((channel) => channel.id === channelId) : undefined;
  if (asked) return { channel: asked };
  if (channels.length === 0) return { problem: "none", choices: [] };
  if (channels.length === 1 && !channelId) return { channel: channels[0] };
  return { problem: "choose", choices: channels };
}

export function splitThread(text: string, platform: string): string[] {
  if (platform !== "x") return [text.trim()].filter(Boolean);
  return text
    .split(/^[ \t]*---[ \t]*$/m)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function parseScheduledAt(value: string | undefined): Date | undefined {
  if (!value?.trim()) return undefined;
  const at = new Date(value.trim());
  if (!OFFSET_TIME.test(value.trim()) || Number.isNaN(at.getTime())) {
    throw new Error(`Could not read the time "${value}". Give a date and time with its time zone offset in ISO 8601.`);
  }
  return at;
}

export function targetFor(channel: Channel, parts: string[]): Target {
  const kept = parts.map((part) => part.trim()).filter(Boolean);
  if (channel.provider === "x" && kept.length > 1) return { channel_id: channel.id, parts: kept };
  return { channel_id: channel.id, caption: kept.join("\n\n") };
}

export function scheduleProblem(at: Date, now: number): string | undefined {
  return at.getTime() < now + MIN_LEAD_MS ? PAST_TIME : undefined;
}

export async function publish(dependencies: PublishDependencies, publication: Publication): Promise<Post> {
  const problem = publication.scheduledAt && scheduleProblem(publication.scheduledAt, dependencies.now());
  if (problem) throw new Error(problem);

  const target = targetFor(publication.channel, publication.parts);
  const slot = slotFor(await dependencies.account(), publication, target);
  const attempt = await dependencies.lock(slot, () => claim(dependencies, slot));
  try {
    const post = await send(dependencies, publication, target, slot, attempt);
    await dependencies.lock(slot, () => settle(dependencies, slot, attempt));
    return post;
  } catch (error) {
    await dependencies.lock(slot, () =>
      mayStillBeRunning(error) ? settle(dependencies, slot, attempt) : dependencies.storage.removeItem(slot),
    );
    throw error;
  }
}

async function claim(dependencies: PublishDependencies, slot: string): Promise<Attempt> {
  await prune(dependencies);
  const now = dependencies.now();
  const stored = await recall(dependencies, slot);
  if (stored?.sending && now - stored.sending < SENDING_STALE_MS) throw new Error(ALREADY_SENDING);
  const attempt = { ...(stored ?? { key: randomUUID(), at: now }), sending: now };
  await remember(dependencies, slot, attempt);
  return attempt;
}

async function settle(dependencies: PublishDependencies, slot: string, attempt: Attempt): Promise<void> {
  const current = (await recall(dependencies, slot)) ?? attempt;
  if (current.key === attempt.key) await remember(dependencies, slot, { ...current, sending: undefined });
}

function send(
  dependencies: PublishDependencies,
  publication: Publication,
  target: Target,
  slot: string,
  attempt: Attempt,
) {
  const { scheduledAt } = publication;
  if (scheduledAt) return schedule(dependencies, publication.brandId, target, attempt, scheduledAt);
  return postNow(dependencies, publication.brandId, target, slot, attempt);
}

async function schedule(
  dependencies: PublishDependencies,
  brandId: string,
  target: Target,
  attempt: Attempt,
  at: Date,
) {
  const { posts } = await dependencies.call<{ posts: Post[] }>("create_posts", {
    brand_id: brandId,
    idempotency_key: attempt.key,
    targets: [target],
    status: "scheduled",
    scheduled_at: at.toISOString(),
  });
  return posts[0];
}

async function postNow(
  dependencies: PublishDependencies,
  brandId: string,
  target: Target,
  slot: string,
  attempt: Attempt,
) {
  let postId = attempt.postId;
  if (!postId) {
    const { posts } = await dependencies.call<{ posts: Post[] }>("create_posts", {
      brand_id: brandId,
      idempotency_key: attempt.key,
      targets: [target],
    });
    const created = posts[0].id;
    await dependencies.lock(slot, () => remember(dependencies, slot, { ...attempt, postId: created }));
    postId = created;
  }
  return dependencies.call<Post>("send_post", {
    brand_id: brandId,
    post_id: postId,
    mode: "now",
    idempotency_key: `${attempt.key}-send`,
  });
}

function slotFor(account: string, { brandId, scheduledAt }: Publication, target: Target): string {
  const digest = createHash("sha256")
    .update(JSON.stringify([account, brandId, target, scheduledAt?.toISOString() ?? "now"]))
    .digest("hex");
  return `${PENDING_POST_PREFIX}${digest.slice(0, 32)}`;
}

function parse(value: string | undefined): Attempt | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as Attempt;
  } catch {
    return undefined;
  }
}

function live(dependencies: PublishDependencies, attempt: Attempt | undefined): Attempt | undefined {
  return attempt && dependencies.now() - attempt.at <= PENDING_POST_TTL_MS ? attempt : undefined;
}

function recall(dependencies: PublishDependencies, slot: string): Promise<Attempt | undefined> {
  return dependencies.storage.getItem(slot).then((value) => live(dependencies, parse(value)));
}

function remember(dependencies: PublishDependencies, slot: string, attempt: Attempt): Promise<void> {
  return dependencies.storage.setItem(slot, JSON.stringify(attempt));
}

async function prune(dependencies: PublishDependencies): Promise<void> {
  const stale = Object.entries(await dependencies.storage.allItems()).filter(
    ([key, value]) => key.startsWith(PENDING_POST_PREFIX) && !live(dependencies, parse(value)),
  );
  for (const [key] of stale) await dependencies.storage.removeItem(key);
}

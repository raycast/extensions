import { request } from "./api";
import { formatDate, postTitle } from "./format";
import { eventPageSchema, MonitorEvent, Post, postSchema, Profile, profileSchema } from "./schemas";

const PAGE_SIZE = 20;
const MENU_TITLE_LENGTH = 48;

export const POST_EVENT_LABELS: Record<string, string> = {
  "tweet.new": "New Post",
  "tweet.reply": "New Reply",
  "tweet.retweet": "New Repost",
  "tweet.quote": "New Quote",
  "tweet.media": "New Media Post",
  "tweet.link": "New Link Post",
  "tweet.poll": "New Poll",
  "tweet.mention": "New Mention",
  "tweet.hashtag": "New Hashtag Post",
  "tweet.longform": "New Long Post",
};

export const ACCOUNT_EVENT_LABELS: Record<string, string> = {
  ...POST_EVENT_LABELS,
  "profile.avatar.changed": "Avatar Changed",
  "profile.banner.changed": "Banner Changed",
  "profile.name.changed": "Name Changed",
  "profile.username.changed": "Username Changed",
  "profile.bio.changed": "Bio Changed",
  "profile.location.changed": "Location Changed",
  "profile.url.changed": "Website Changed",
  "profile.verified.changed": "Verification Changed",
  "profile.protected.changed": "Privacy Changed",
  "profile.pinned_tweet.changed": "Pinned Post Changed",
  "profile.unavailable.changed": "Availability Changed",
  "tweet.deleted": "Post Deleted",
  "broadcast.started": "Live Video Started",
  "space.started": "Space Started",
  "following.added": "Followed Account",
  "following.removed": "Unfollowed Account",
  "follower.added": "New Follower",
  "follower.removed": "Follower Lost",
  "profile.followers.changed": "Follower Count Changed",
  "profile.following.changed": "Following Count Changed",
};

const POST_MONITOR_EVENT_LABELS: Record<string, string> = {
  "post.reply.new": "New Reply",
  "post.quote.new": "New Quote",
  "post.likes.changed": "Likes Changed",
  "post.retweets.changed": "Reposts Changed",
  "post.replies.changed": "Replies Changed",
  "post.quotes.changed": "Quotes Changed",
  "post.bookmarks.changed": "Bookmarks Changed",
  "post.views.changed": "Views Changed",
  "post.edited": "Post Edited",
  "post.deleted": "Post Deleted",
};

export type EventFilter = { monitorId?: string; keywordMonitorId?: string };

export type EventPage = { events: MonitorEvent[]; nextCursor: string | undefined };

export function eventLabel(type: string): string {
  return ACCOUNT_EVENT_LABELS[type] ?? POST_MONITOR_EVENT_LABELS[type] ?? type;
}

export function eventPost(event: MonitorEvent): Post | undefined {
  return postSchema.safeParse(event.data).data;
}

export function eventProfile(event: MonitorEvent): Profile | undefined {
  return profileSchema.safeParse(event.data).data;
}

export type EventField = { title: string; value: string };

export function eventFields({ data }: MonitorEvent): EventField[] {
  if (typeof data !== "object" || data === null || Array.isArray(data)) return [];
  return Object.entries(data)
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([key, value]) => ({
      title: key.charAt(0).toUpperCase() + key.slice(1),
      value: typeof value === "object" ? JSON.stringify(value) : String(value),
    }));
}

export async function fetchEventPage(filter: EventFilter, cursor?: string): Promise<EventPage> {
  const page = await request(eventPageSchema, "/events", { query: { ...filter, limit: PAGE_SIZE, after: cursor } });
  return { events: page.events, nextCursor: page.hasMore ? page.nextCursor || undefined : undefined };
}

export function unseenEvents(events: MonitorEvent[], seenAt: string | undefined): MonitorEvent[] {
  if (!seenAt) return events;
  const seen = Date.parse(seenAt);
  return events.filter((event) => Date.parse(event.occurredAt) > seen);
}

export function newestEventDate(events: MonitorEvent[]): string | undefined {
  return events.reduce<string | undefined>(
    (newest, { occurredAt }) => (!newest || Date.parse(occurredAt) > Date.parse(newest) ? occurredAt : newest),
    undefined,
  );
}

// A monitor can watch 30 event types, so a row names 1 type and counts several.
export function eventTypeSummary(types: readonly string[]): string {
  return types.length === 1 ? eventLabel(types[0]) : `${types.length} Events`;
}

export type MenuEventRow = { event: MonitorEvent; post?: Post; source?: string; title: string; subtitle: string };

const shorten = (text: string) => (text.length > MENU_TITLE_LENGTH ? `${text.slice(0, MENU_TITLE_LENGTH - 1)}…` : text);

// Raycast doesn't run the actions of identical sibling menu items correctly,
// so each row shows its time and numbers repeats.
export function menuEventRows(events: MonitorEvent[]): MenuEventRow[] {
  const copies = new Map<string, number>();
  return events.map((event) => {
    const post = eventPost(event);
    const source = event.username ? `@${event.username}` : (event.query ?? undefined);
    const title = shorten(post ? postTitle(post.text) : eventLabel(event.type));
    const label = post ? eventLabel(event.type) : source;
    const detail = [label, formatDate(event.occurredAt)].filter(Boolean).join(" · ");
    const key = JSON.stringify([title, detail]);
    const copy = (copies.get(key) ?? 0) + 1;
    copies.set(key, copy);
    return { event, post, source, title, subtitle: copy === 1 ? detail : `${detail} (${copy})` };
  });
}

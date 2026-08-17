import { randomUUID } from "node:crypto";
import { buildNip98Header, getPublicKeyHex, signEvent } from "./nostr";
import { normalizeRelayUrl } from "./relay-url";
import { getThreadReference, isThreadReply } from "./threading";
import { parseOpenedChannelId } from "./dm-response";
import { newestPerAuthor, profileName, shortenPubkey } from "./directory";
import type { Channel, DirectMessage, Filter, Message, NostrEvent, UserStatus } from "./types";

/** Fetch multiple of the requested limit, since replies are filtered out after the query. */
const OVER_FETCH = 4;
/** The relay's documented maximum results per filter. */
const RELAY_MAX_RESULTS = 500;
/**
 * How many pages `queryAll` will walk before giving up, bounding both the work
 * and a relay that ignores `until`. 10 pages covers 5000 kind:39000 events,
 * far beyond any workspace this extension is likely to meet.
 */
const MAX_PAGES = 10;

export class RelayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RelayError";
  }
}

/**
 * The value of the first tag with the given name. A tag is only usable when it
 * is an array carrying a string value: live Buzz DM events genuinely contain
 * valueless tags such as `["private"]`, and a relay is free to send a tag as a
 * bare string, which would otherwise be indexed character by character
 * (`"private"[0] === "p"`). Either shape must not shadow the real tag.
 */
function tagValue(event: NostrEvent, name: string): string | undefined {
  const tag = event.tags.find((t) => Array.isArray(t) && t[0] === name && typeof t[1] === "string");
  return tag?.[1];
}

/**
 * Whether a kind:39000 channel-metadata event is a Buzz DM conversation
 * rather than an ordinary channel. Verified empirically against a live
 * relay: a DM is not its own event kind, it is a 39000 event carrying a
 * `["t","dm"]` tag. `listChannels` uses this to exclude DMs from the channel
 * list; `listDirectMessages` uses it to find them. The tag's value matters as
 * much as its name: a channel carrying an ordinary topic tag such as
 * `["t","announcements"]` is not a DM and must stay in the channel list.
 */
function isDmChannel(event: NostrEvent): boolean {
  return event.kind === 39000 && event.tags.some((tag) => Array.isArray(tag) && tag[0] === "t" && tag[1] === "dm");
}

function hasParticipant(event: NostrEvent, pubkey: string): boolean {
  return event.tags.some((tag) => Array.isArray(tag) && tag[0] === "p" && tag[1] === pubkey);
}

function toChannel(event: NostrEvent): Channel {
  return {
    id: tagValue(event, "d") ?? "",
    name: tagValue(event, "name") ?? "",
    about: tagValue(event, "about"),
  };
}

function toMessage(event: NostrEvent): Message {
  return {
    id: event.id,
    author: event.pubkey,
    content: event.content,
    createdAt: event.created_at,
    channelId: tagValue(event, "h") ?? "",
    replyCount: 0,
  };
}

/**
 * Newest first, with the id as a tie-break so the order is total. Without the
 * tie-break, two messages sharing a `created_at` (Buzz stamps whole seconds)
 * order arbitrarily, and the one that survives a `limit` boundary flips between
 * refreshes.
 */
function newestFirst(a: Message, b: Message): number {
  return b.createdAt - a.createdAt || a.id.localeCompare(b.id);
}

/**
 * Nostr treats kinds 10000-19999 as replaceable and 30000-39999 as
 * parameterized-replaceable: the relay keeps only the newest event per
 * coordinate. Kind 0 (metadata) and kind 3 (contacts) are also replaceable,
 * but this client never publishes either, so only the two numeric ranges it
 * actually writes into are handled here rather than pretending to be
 * exhaustive over the whole spec.
 */
function isReplaceableKind(kind: number): boolean {
  return (kind >= 10000 && kind <= 19999) || (kind >= 30000 && kind <= 39999);
}

function replaceableDTag(tags: string[][]): string {
  return tags.find((t) => t[0] === "d")?.[1] ?? "";
}

function replaceableCoordinate(kind: number, tags: string[][]): string {
  return `${kind}:${replaceableDTag(tags)}`;
}

/**
 * Last `created_at` (in seconds) this process has published for a given
 * replaceable coordinate. Module-level rather than a `BuzzClient` field: the
 * Set Status command's "apply" and "clear" affordances each call
 * `getClient()` in src/lib/preferences.ts, which mints a fresh `BuzzClient`
 * per action, so an instance field would not see both calls.
 *
 * Why this exists: the relay (crates/buzz-db/src/event.rs in block/buzz)
 * breaks a created_at tie on a replaceable coordinate by keeping the event
 * with the LOWEST id ("canonical NIP-16 ordering"), so two replaceable
 * publishes that land in the same wall-clock second are a coin flip on
 * whose sha256 sorts lower. `signEvent` stamps `Math.floor(Date.now() /
 * 1000)`, so a set-then-clear within the same second could silently lose.
 *
 * This map alone is not enough, because it dies with the Raycast command
 * process: several publishes in one second push created_at seconds into the
 * future, and a fresh process a second later would stamp a LOWER created_at,
 * which the relay discards while still answering "accepted". So the map is
 * only the cheap in-process floor; `BuzzClient.publishSigned` also reads the
 * event the relay currently stores for the coordinate and stamps strictly
 * above that. Both floors are combined in `nextCreatedAt`.
 */
const lastReplaceableCreatedAt = new Map<string, number>();

/**
 * The created_at to stamp on an outgoing event: now for an ordinary kind, and
 * for a replaceable one, strictly greater than both the last value this
 * process used for the coordinate and `storedCreatedAt` (the created_at the
 * relay currently holds there, when it could be read).
 */
function nextCreatedAt(kind: number, tags: string[][], storedCreatedAt?: number): number {
  const now = Math.floor(Date.now() / 1000);
  if (!isReplaceableKind(kind)) return now;
  const key = replaceableCoordinate(kind, tags);
  const floors = [now];
  const last = lastReplaceableCreatedAt.get(key);
  if (last !== undefined) floors.push(last + 1);
  if (storedCreatedAt !== undefined) floors.push(storedCreatedAt + 1);
  const createdAt = Math.max(...floors);
  lastReplaceableCreatedAt.set(key, createdAt);
  return createdAt;
}

/** Test-only: forget all tracked replaceable-coordinate clock state. */
export function __resetReplaceableClock(): void {
  lastReplaceableCreatedAt.clear();
}

/**
 * Test-only: expose the monotonic created_at calculation directly, so tests
 * can exercise coordinate isolation (e.g. two different `d` tags on the same
 * kind) without adding a public `BuzzClient` method just to pick one.
 */
export function __nextReplaceableCreatedAt(kind: number, tags: string[][], storedCreatedAt?: number): number {
  return nextCreatedAt(kind, tags, storedCreatedAt);
}

/**
 * The newer of two events, treating an unusable `created_at` as older than any
 * real timestamp. A plain `b.created_at > a.created_at` comparison is false
 * against a missing or NaN timestamp, so an event carrying junk would win over
 * a valid newer one purely by arriving first.
 */
function newerEvent(a: NostrEvent, b: NostrEvent): NostrEvent {
  if (!Number.isFinite(b.created_at)) return a;
  if (!Number.isFinite(a.created_at)) return b;
  return b.created_at > a.created_at ? b : a;
}

async function readRelayError(res: Response): Promise<string> {
  try {
    const text = await res.text();
    if (!text) return "";
    try {
      const data = JSON.parse(text) as { error?: unknown };
      if (typeof data.error === "string") return data.error.slice(0, 200);
    } catch {
      // body was not JSON; fall through to the raw text
    }
    return text.slice(0, 200);
  } catch {
    return "";
  }
}

export class BuzzClient {
  private readonly relayUrl: string;
  private readonly secretKey: Uint8Array;

  constructor(relayUrl: string, secretKey: Uint8Array) {
    this.relayUrl = normalizeRelayUrl(relayUrl);
    this.secretKey = secretKey;
  }

  async query(filters: Filter[]): Promise<NostrEvent[]> {
    const data = await this.post("/query", filters);
    if (!Array.isArray(data)) {
      throw new RelayError("Relay returned an unexpected response to a query");
    }
    return data as NostrEvent[];
  }

  /**
   * Every event matching a filter, paging past the relay's per-query ceiling.
   *
   * This exists because channels and DM conversations are both kind 39000 and
   * are told apart only by a `t` tag, which a Nostr filter cannot express as an
   * exclusion. A single capped query would hand back an arbitrary 500 of the
   * combined set and each caller would then filter that truncated slice, so a
   * workspace with more than 500 of them would silently lose channels from
   * Search Channels and conversations from Send Message, with no way for the
   * caller to tell a short list from a complete one.
   *
   * Paging walks backwards with `until` set to the oldest `created_at` seen,
   * inclusive rather than one second earlier, so a run of events sharing a
   * timestamp cannot fall through the gap between pages. The overlap that
   * causes is absorbed by deduplicating on event id. `MAX_PAGES` bounds the
   * walk, and a page that contributes nothing new ends it early, so a relay
   * that ignores `until` cannot spin here.
   */
  private async queryAll(filter: Filter): Promise<NostrEvent[]> {
    const seen = new Set<string>();
    const all: NostrEvent[] = [];
    let until: number | undefined;

    for (let page = 0; page < MAX_PAGES; page++) {
      const paged: Filter = { ...filter, limit: RELAY_MAX_RESULTS };
      if (until !== undefined) paged.until = until;
      const events = await this.query([paged]);

      // Only the deliberate overlap between pages is deduplicated. What a
      // single page contains is the relay's own answer and is passed through
      // untouched, so a one-page result is exactly what `query` returned.
      const fresh = page === 0 ? events : events.filter((event) => !seen.has(event.id));
      all.push(...fresh);
      for (const event of events) seen.add(event.id);

      // A short page means the relay had nothing more to give.
      if (events.length < RELAY_MAX_RESULTS) break;
      // A full page carrying nothing new means paging cannot make progress.
      if (fresh.length === 0) break;
      until = Math.min(...events.map((event) => event.created_at));
    }

    return all;
  }

  async publish(event: NostrEvent): Promise<{ accepted: boolean; message: string }> {
    const data = (await this.post("/events", event)) as {
      accepted?: boolean;
      message?: string;
    };
    return { accepted: data.accepted ?? false, message: data.message ?? "" };
  }

  async listChannels(): Promise<Channel[]> {
    const events = await this.queryAll({ kinds: [39000] });
    // DM conversations are 39000 events too (tagged ["t","dm"]); they are
    // surfaced by listDirectMessages instead, not the regular channel list.
    // A channel with no `d` tag has no usable identifier: it would collide with
    // other such channels as a list key and query messages with an empty h tag.
    return events
      .filter((event) => !isDmChannel(event))
      .map(toChannel)
      .filter((channel) => channel.id !== "");
  }

  /**
   * Recent messages in a channel, collapsed the way Buzz collapses them: thread
   * replies are hidden and counted against their root instead.
   *
   * The filtering is client-side because a Nostr filter cannot express the
   * absence of a tag, so the relay sends replies regardless. That means asking
   * for `limit` events can yield far fewer after filtering, hence the
   * over-fetch. It is a heuristic: a channel that is mostly replies can still
   * come back short, even to zero: a channel whose fetched window is entirely
   * replies to roots outside that window collapses to an empty `messages` array
   * even though the channel is not empty. `fetchedCount` (the relay's raw event
   * count before the reply filter) is what lets a caller tell that case apart
   * from a truly empty channel, where `fetchedCount` is 0 too. The alternative
   * to the heuristic is pagination, which the relay's 500 result ceiling limits
   * anyway.
   */
  async getMessages(channelId: string, limit = 50): Promise<{ messages: Message[]; fetchedCount: number }> {
    const fetched = await this.query([
      { kinds: [9], "#h": [channelId], limit: Math.min(limit * OVER_FETCH, RELAY_MAX_RESULTS) },
    ]);

    // A relay that echoes an event twice would otherwise produce two rows with
    // the same React key and count the same reply twice against its root. The
    // same defensive dedupe listDirectMessages does, for the same reason.
    const seenIds = new Set<string>();
    const events = fetched.filter((event) => {
      if (seenIds.has(event.id)) return false;
      seenIds.add(event.id);
      return true;
    });

    const replyCounts = new Map<string, number>();
    for (const event of events) {
      const rootId = getThreadReference(event.tags).rootId;
      if (rootId !== null) {
        replyCounts.set(rootId, (replyCounts.get(rootId) ?? 0) + 1);
      }
    }

    const messages = events
      .filter((event) => !isThreadReply(event.tags))
      .map((event) => ({ ...toMessage(event), replyCount: replyCounts.get(event.id) ?? 0 }))
      .sort(newestFirst)
      .slice(0, limit);

    return { messages, fetchedCount: events.length };
  }

  async searchMessages(q: string, opts?: { limit?: number }): Promise<Message[]> {
    const events = await this.query([{ search: q, kinds: [9], limit: opts?.limit ?? 50 }]);
    return events.map(toMessage).sort(newestFirst);
  }

  async sendMessage(channelId: string, content: string): Promise<void> {
    await this.publishSigned({ kind: 9, tags: [["h", channelId]], content });
  }

  async react(msgId: string, channelId: string, reaction: string): Promise<void> {
    await this.publishSigned({
      kind: 7,
      tags: [
        ["e", msgId],
        ["h", channelId],
      ],
      content: reaction,
    });
  }

  /**
   * Publish a NIP-38 status. Buzz carries the emoji in a dedicated `emoji`
   * tag, not inside the content: its desktop and mobile clients read
   * `tags.find((t) => t[0] === "emoji")`, so an emoji folded into the text
   * would render as literal characters with no emoji field.
   */
  async setStatus(text: string, emoji?: string): Promise<void> {
    const trimmedEmoji = emoji?.trim() ?? "";
    const tags: string[][] = [["d", "general"]];
    if (trimmedEmoji) {
      tags.push(["emoji", trimmedEmoji]);
    }
    await this.publishSigned({ kind: 30315, tags, content: text.trim() });
  }

  /**
   * Clear the status. Kind 30315 is parameterized-replaceable, so an event
   * with neither text nor emoji is what Buzz clients read as "no status".
   */
  async clearStatus(): Promise<void> {
    await this.setStatus("");
  }

  /**
   * Read our own NIP-38 status. Returns null when the newest event carries
   * neither text nor emoji, which is how Buzz clients represent "no status".
   */
  async getStatus(): Promise<UserStatus | null> {
    const pubkey = getPublicKeyHex(this.secretKey);
    const events = await this.query([{ kinds: [30315], authors: [pubkey], "#d": ["general"], limit: 1 }]);
    if (events.length === 0) return null;
    const newest = events.reduce(newerEvent);
    const status = { text: newest.content, emoji: tagValue(newest, "emoji") ?? "" };
    return status.text || status.emoji ? status : null;
  }

  // Presence (kind 20001) is WebSocket-only on the relay; the set-presence
  // command is deferred to Tier B. This helper builds the correct event for
  // that future path.
  async setPresence(state: "online" | "away" | "offline"): Promise<void> {
    await this.publishSigned({ kind: 20001, tags: [], content: state });
  }

  /**
   * Display names for the given pubkeys, from their kind:0 profiles. Pubkeys
   * with no profile, or a profile carrying no usable name, are simply absent
   * from the map; callers fall back to a shortened pubkey.
   */
  async lookupProfiles(pubkeys: string[]): Promise<Map<string, string>> {
    const names = new Map<string, string>();
    if (pubkeys.length === 0) return names;

    const events = await this.query([{ kinds: [0], authors: pubkeys }]);
    for (const event of newestPerAuthor(events)) {
      const name = profileName(event.content);
      if (name !== "") names.set(event.pubkey, name);
    }
    return names;
  }

  /**
   * The DM conversations we are part of. A Buzz DM is a private channel rather
   * than an encrypted envelope: a conversation is a kind:39000 channel-metadata
   * event carrying a `["t","dm"]` tag, one `["p", <participant>]` tag per
   * participant (including us), and a `d` tag that is the channel id messages
   * are then sent into normally, same as any other channel.
   *
   * Kind 41001 was the first hypothesis and is wrong: it was tried against
   * this relay's HTTP bridge with a `#p` filter, with only a `limit`, and
   * with no filter at all, and every variation returned zero events even
   * though the desktop app shows the conversations. Do not restore a 41001
   * query here.
   *
   * The query narrows to our own conversations server-side with `#p` and
   * `#t`. That is not an assumption: both were probed against a live relay,
   * where `{kinds:[39000]}` returned 5 events and `{kinds:[39000],"#p":[me]}`
   * returned exactly the 3 containing our pubkey, so the filter is applied
   * rather than ignored. Narrowing matters because the alternative is walking
   * the whole shared kind:39000 space, which `queryAll` can only page through
   * up to `MAX_PAGES` before it starts silently dropping conversations.
   *
   * Buzz is self-hostable, so a relay on the other end may be older than the
   * one probed. Two guards cover that, in the two directions it can fail:
   * a relay that IGNORES the tag filters returns a superset, which the
   * client-side filtering below still reduces correctly; a relay that does not
   * SUPPORT them returns nothing, which would silently empty the list, so an
   * empty answer retries unfiltered rather than being believed.
   */
  async listDirectMessages(): Promise<DirectMessage[]> {
    const me = getPublicKeyHex(this.secretKey);
    const narrowed = await this.queryAll({ kinds: [39000], "#p": [me], "#t": ["dm"] });
    const events = narrowed.length > 0 ? narrowed : await this.queryAll({ kinds: [39000] });

    const conversations = events
      .filter((event) => isDmChannel(event) && hasParticipant(event, me))
      .map((event) => ({
        channelId: tagValue(event, "d") ?? "",
        participants: event.tags
          .filter((tag) => Array.isArray(tag) && tag[0] === "p" && typeof tag[1] === "string" && tag[1] !== me)
          .map((tag) => tag[1]),
      }))
      // Without a `d` tag there is no channel id, so messages would be sent
      // with an empty `h` tag, the same reason listChannels drops those.
      .filter((conversation) => conversation.channelId !== "");

    // Kind 39000 is parameterized-replaceable, so the relay already keeps at
    // most one event per (kind, d) coordinate; this dedupe is a defensive
    // backstop in case that guarantee is ever violated. Two events sharing a
    // `d` tag would otherwise become a duplicate React key downstream; keep
    // only the first one seen.
    const seenChannelIds = new Set<string>();
    const deduped = conversations.filter((conversation) => {
      if (seenChannelIds.has(conversation.channelId)) return false;
      seenChannelIds.add(conversation.channelId);
      return true;
    });

    const others = [...new Set(deduped.flatMap((c) => c.participants))];
    const names = await this.lookupProfiles(others);

    return deduped.map((conversation) => ({
      ...conversation,
      name: conversation.participants.map((pk) => names.get(pk) ?? shortenPubkey(pk)).join(", ") || "Direct message",
    }));
  }

  /**
   * Open a conversation with someone and return its channel id. The publish is
   * idempotent: when a conversation already exists the relay answers with that
   * conversation's id instead of creating a second one.
   *
   * The id is generated here and sent as the `d` tag, then the relay's own id is
   * preferred if it returns one. That fallback is what Buzz's CLI does, and it
   * is load-bearing: without it, a relay that does not echo an id leaves us with
   * no channel to send into.
   */
  async openDirectMessage(pubkey: string): Promise<string> {
    const localId = randomUUID();
    const result = await this.publishSigned({
      kind: 41010,
      tags: [
        ["p", pubkey],
        ["d", localId],
      ],
      content: "",
    });
    return parseOpenedChannelId(result.message) ?? localId;
  }

  private async publishSigned(fields: {
    kind: number;
    tags: string[][];
    content: string;
  }): Promise<{ accepted: boolean; message: string }> {
    const stored = isReplaceableKind(fields.kind)
      ? await this.storedReplaceableCreatedAt(fields.kind, fields.tags)
      : undefined;
    const created_at = nextCreatedAt(fields.kind, fields.tags, stored);
    const event = signEvent({ ...fields, created_at }, this.secretKey);
    const result = await this.publish(event);
    if (!result.accepted) {
      // Carry the relay's own reason when it gives one: a bare "auth or
      // permission" is what hid the kind:20001 WebSocket-only rejection.
      throw new RelayError(
        result.message
          ? `Relay rejected the request: ${result.message.slice(0, 200)}`
          : "Relay rejected the request (auth or permission)",
      );
    }
    return result;
  }

  /**
   * The `created_at` of the event the relay currently stores for a replaceable
   * coordinate of ours, or undefined when there is none. Seeding the clock from
   * the relay is what makes the monotonicity survive a process boundary: the
   * in-process map above is gone the moment the Raycast command exits, and a
   * new process that stamped only `now` could land below an event this same
   * client pushed into the future seconds earlier, which the relay would keep
   * while still answering "accepted".
   *
   * One extra query per replaceable publish; status changes are not a hot path.
   * A replaceable kind carrying no `d` tag (the 10000-19999 range, which this
   * client never publishes) simply finds nothing here and falls back to the
   * in-process floor.
   */
  private async storedReplaceableCreatedAt(kind: number, tags: string[][]): Promise<number | undefined> {
    let events: NostrEvent[];
    try {
      events = await this.query([
        { kinds: [kind], authors: [getPublicKeyHex(this.secretKey)], "#d": [replaceableDTag(tags)], limit: 1 },
      ]);
    } catch {
      // A failed pre-read must not block the publish: the in-process floor
      // still applies, and the publish itself reports any real relay trouble.
      return undefined;
    }
    const timestamps = events.map((event) => event.created_at).filter((at) => Number.isFinite(at));
    return timestamps.length === 0 ? undefined : Math.max(...timestamps);
  }

  private async post(path: string, body: unknown): Promise<unknown> {
    const url = `${this.relayUrl}${path}`;
    const bodyStr = JSON.stringify(body);
    const authorization = buildNip98Header(url, "POST", bodyStr, this.secretKey);

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authorization },
        body: bodyStr,
      });
    } catch {
      // Do not include the caught error: it must never risk echoing request data.
      throw new RelayError(`Cannot reach relay at ${this.relayUrl}`);
    }

    if (!res.ok) {
      const detail = await readRelayError(res);
      throw new RelayError(
        detail
          ? `Relay rejected the request (status ${res.status}): ${detail}`
          : `Relay rejected the request (status ${res.status})`,
      );
    }
    return res.json();
  }
}

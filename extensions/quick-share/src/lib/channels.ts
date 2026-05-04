export type SlackChannel = { id: string; name: string; isPrivate: boolean };
export type ChannelCache = { channels: SlackChannel[]; fetchedAt: number };

export class ChannelsScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChannelsScopeError";
  }
}

export class ChannelsAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChannelsAuthError";
  }
}

export class ChannelsNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChannelsNetworkError";
  }
}

type ConversationsListResponse = {
  ok: boolean;
  error?: string;
  channels?: Array<{ id: string; name: string; is_private?: boolean }>;
  response_metadata?: { next_cursor?: string };
};

const PAGE_LIMIT = 1000;
const MAX_PAGES = 50;
const CHANNEL_ID_PATTERN = /^[CG][A-Z0-9]{8,}$/;

export async function fetchAllChannels(token: string): Promise<ChannelCache> {
  const collected: SlackChannel[] = [];
  let cursor = "";

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL("https://slack.com/api/conversations.list");
    url.searchParams.set("types", "public_channel,private_channel");
    url.searchParams.set("exclude_archived", "true");
    url.searchParams.set("limit", String(PAGE_LIMIT));
    if (cursor.length > 0) {
      url.searchParams.set("cursor", cursor);
    }

    let res: Response;
    try {
      res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (e) {
      throw new ChannelsNetworkError(e instanceof Error ? e.message : "network error");
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = (await res.json()) as ConversationsListResponse;
    if (!data.ok) {
      const error = data.error ?? "unknown error";
      if (error === "missing_scope") {
        throw new ChannelsScopeError(`Slack API: ${error}`);
      }
      if (error === "invalid_auth" || error === "not_authed" || error === "token_revoked") {
        throw new ChannelsAuthError(`Slack API: ${error}`);
      }
      throw new Error(error);
    }

    for (const c of data.channels ?? []) {
      collected.push({ id: c.id, name: c.name, isPrivate: c.is_private === true });
    }

    cursor = data.response_metadata?.next_cursor ?? "";
    if (!(cursor && cursor.length > 0)) {
      break;
    }
  }

  collected.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  return { channels: collected, fetchedAt: Date.now() };
}

export function tokenFingerprint(token: string): string {
  return token.slice(-12);
}

export function resolveChannelIds(entries: string[], channels: SlackChannel[]): string[] {
  const idIndex = new Map<string, SlackChannel>();
  const nameIndex = new Map<string, SlackChannel>();
  for (const c of channels) {
    idIndex.set(c.id, c);
    nameIndex.set(c.name, c);
  }

  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of entries) {
    let resolved: string | undefined;
    if (CHANNEL_ID_PATTERN.test(entry)) {
      if (idIndex.has(entry)) {
        resolved = entry;
      }
    } else {
      const match = nameIndex.get(entry);
      if (match) {
        resolved = match.id;
      }
    }
    if (resolved && !seen.has(resolved)) {
      seen.add(resolved);
      result.push(resolved);
    }
  }
  return result;
}

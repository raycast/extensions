import { getSlackApp } from "./slackAuth";

let appPromise = null;
function slack() {
  if (!appPromise) appPromise = getSlackApp();
  return appPromise.then((app) => app.client);
}

/**
 * Wrapper for Slack API calls with rate limit handling.
 */
export async function slackCall(method, params) {
  while (true) {
    try {
      return await (await slack()).apiCall(method, params);
    } catch (e) {
      const isRateLimited = e.code === "slack_webapi_platform_error" && e.data?.error === "ratelimited";
      if (isRateLimited) {
        const wait = Number(e.data?.headers?.["retry-after"] || 1);
        console.warn(`Rate-limited on ${method}. Waiting ${wait}s …`);
        await sleep(wait * 1000);
        continue;
      }
      throw e;
    }
  }
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * Get channel ID by channel name.
 */
export async function fetchChannelIdByName(name) {
  let cursor;

  do {
    const res = await slackCall("conversations.list", {
      exclude_archived: true,
      limit: 1000,
      cursor,
      types: "public_channel,private_channel",
    });

    // Look for the channel with matching name
    const found = res.channels.find((c) => c.name === name);
    if (found) return found.id;

    // Prepare for next pagination if needed
    cursor = res.response_metadata?.next_cursor;
  } while (cursor);

  throw new Error(`Channel ${name} not found or bot not invited`);
}

/**
 * Fetch every (non-deleted) member and return a map { U123: { ...user }, ... }
 */
export async function fetchAllUsers() {
  const usersById = {};
  let cursor = null;

  console.log("Fetching users list…");
  do {
    const res = await slackCall("users.list", cursor ? { cursor } : {});
    if (!res.ok) throw new Error(`Slack API error: ${res.error}`);
    (res.members ?? []).forEach((user) => {
      if (!user.deleted) {
        usersById[user.id] = user;
      }
    });
    cursor = res.response_metadata?.next_cursor || null;
  } while (cursor);
  return usersById;
}

/**
 * Fetch all messages in a thread.
 */
export async function fetchFullThread(channelId, threadTs) {
  const res = await slackCall("conversations.replies", {
    channel: channelId,
    ts: threadTs,
    limit: 200,
  });
  return res.messages;
}

/**
 * Get all threads and single messages for a channel since oldestTs.
 * Returns { bundles: [{ ts: number, messages: Message[] }] } sorted by timestamp.
 */
export async function fetchThreadsForChannel(channelId, oldestTs) {
  const bundles = [];
  let cursor;

  do {
    const res = await slackCall("conversations.history", {
      channel: channelId,
      oldest: String(oldestTs),
      limit: 1000,
      cursor,
    });

    // Process all messages in a single pass
    for (const msg of res.messages) {
      if (msg.thread_ts === msg.ts) {
        // Thread parent - fetch full thread
        const fullThread = await fetchFullThread(channelId, msg.ts);
        bundles.push({ ts: Number(msg.ts), messages: fullThread });
      } else if (!msg.thread_ts) {
        // Single message
        bundles.push({ ts: Number(msg.ts), messages: [msg] });
      }
    }

    cursor = res.response_metadata?.next_cursor;
  } while (cursor);

  if (!bundles.length) return null;

  bundles.sort((a, b) => a.ts - b.ts);

  return { bundles };
}

/**
 * List all channels available to the user.
 * Returns an array of { id, name } objects sorted alphabetically.
 */
export async function fetchChannels() {
  const channels = [];
  let cursor;

  console.log("Fetching channels list…");
  do {
    const res = await slackCall("conversations.list", {
      exclude_archived: true,
      limit: 1000,
      cursor,
      types: "public_channel,private_channel",
    });
    channels.push(
      ...res.channels.map((c) => ({
        id: c.id,
        name: c.name,
      })),
    );
    cursor = res.response_metadata?.next_cursor;
  } while (cursor);
  return channels.sort((a, b) => a.name.localeCompare(b.name));
}

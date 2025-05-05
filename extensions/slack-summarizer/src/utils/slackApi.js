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
export async function getChannelIdByName(name) {
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
 * Fetch every (non-deleted) member and return a map { U123: { ...user }, ... }
 */
export async function getAllUsers() {
  const usersById = {};
  let cursor = null;
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
 * Fetch threads and single messages from a channel since oldestTs.
 */
export async function fetchChannelThreads(channelId, oldestTs) {
  const parents = []; // Thread parent messages
  const singles = []; // Standalone messages
  let cursor;

  do {
    const res = await slackCall("conversations.history", {
      channel: channelId,
      oldest: String(oldestTs),
      limit: 1000,
      cursor,
    });

    // Categorize messages
    res.messages.forEach((m) => {
      // Thread parent (has thread_ts equal to its own ts)
      if (m.thread_ts && m.thread_ts === m.ts) {
        parents.push(m);
      }
      // Single message (no thread_ts)
      else if (!m.thread_ts) {
        singles.push(m);
      }
      // Note: thread replies (where thread_ts !== ts) are ignored here
    });

    cursor = res.response_metadata?.next_cursor;
  } while (cursor);

  return { parents, singles };
}

/**
 * Get all threads, with the replies, for a channel since oldestTs.
 */
export async function getThreadsForChannel(channelId, oldestTs) {
  const { parents, singles } = await fetchChannelThreads(channelId, oldestTs);

  if (!parents.length && !singles.length) return null;

  const bundles = [];

  for (const parent of parents) {
    const fullThread = await fetchFullThread(channelId, parent.thread_ts);
    bundles.push({ ts: Number(fullThread[0].ts), messages: fullThread });
  }
  for (const single of singles) {
    bundles.push({ ts: Number(single.ts), messages: [single] });
  }

  bundles.sort((a, b) => a.ts - b.ts);
  return { bundles };
}

/**
 * List all channels available to the user.
 * Returns an array of { id, name } objects sorted alphabetically.
 */
export async function listChannels() {
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

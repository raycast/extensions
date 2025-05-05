import { withCache } from "@raycast/utils";
import { callOpenAIChannel, callOpenAIThread } from "./openaiApi";
import { getChannelIdByName, getAllUsers, fetchFullThread, getThreadsForChannel } from "./slackApi";

let userMap = {};

// ──────────────────────────────────────────────────────────────
// Shared helpers

// Turn a thread URL | ts → {channelId, threadTs}
function parseThread(input) {
  // URL pattern: https://…/archives/C12345/p1714445821123456
  if (/^https?:\/\//i.test(input)) {
    const m = input.match(/archives\/([A-Z0-9]+)\/p(\d{16})/);
    if (!m) throw new Error("Unrecognised Slack thread URL");
    return { channelId: m[1], threadTs: `${Number(m[2]) / 1000000}` };
  }
  // raw ts => we still need channelId
  throw new Error("Unrecognised Slack thread URL");
}

async function loadAllUsers() {
  userMap = await withCache(getAllUsers, {
    maxAge: 60 * 60 * 1000 * 24 * 14, // 14 days in ms
  })();
  return userMap;
}

function getUserName(uid) {
  if (!uid) return "system";
  const u = userMap[uid];
  return u?.profile?.display_name?.trim() || u?.profile?.real_name?.trim() || uid;
}

function replaceUserMentions(text = "") {
  return text.replace(/<@(\w+)>/g, (_, id) => `@${getUserName(id)}`);
}

function buildPromptBody(messages, itemIdx = 1) {
  return [
    `Thread ${itemIdx}:`,
    ...messages.map((m) => {
      const name = getUserName(m.user);
      const txt = replaceUserMentions(m.text?.replace(/\n/g, " ") ?? "");
      return `- @${name}: ${txt}`;
    }),
    "",
  ].join("\n");
}

// ──────────────────────────────────────────────────────────────

// Public API
export async function summarizeChannel(channelName, days = 7, customPrompt) {
  await loadAllUsers();

  const channelId = await getChannelIdByName(channelName);

  const oldestTs = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;
  const result = await getThreadsForChannel(channelId, oldestTs);
  if (!result) throw new Error("No threads found in the channel in the specified duration.");

  const promptBody = result.bundles.map((b, i) => buildPromptBody(b.messages, i + 1)).join("\n");

  return callOpenAIChannel(promptBody, channelName, customPrompt);
}

export async function summarizeThread(rawInput, customPrompt) {
  await loadAllUsers();

  const { channelId, threadTs } = parseThread(rawInput);
  const messages = await fetchFullThread(channelId, threadTs);
  const promptBody = buildPromptBody(messages);

  return callOpenAIThread(promptBody, customPrompt);
}

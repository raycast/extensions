import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/**
 * Grok Bot has no public API for listing Bots, so we read the roster the
 * desktop app caches locally. Each cached slice is a JSON file named
 * `<base32(key)>.blob` holding `{ schemaVersion, value }`, where `key` looks
 * like `sand.client.slice.account.<accountId>.roster.last-roster`.
 */

export interface Bot {
  id: string;
  /** Name exactly as shown in Grok Bot, emoji included. */
  name: string;
  /** Name without leading emoji/symbols, e.g. "Ada · Research Bot". */
  displayName: string;
  /** First word of the display name, e.g. "Ada". */
  firstName: string;
  avatarShape: string;
  avatarColor: string;
  lastActivityAt: number;
  unreadCount: number;
  isHidden: boolean;
  isGroup: boolean;
  isPinned: boolean;
  section?: string;
  /** The Bot's latest message to you, from Grok Bot's cached chat (or its chat preview). */
  lastMessage?: { text: string; timestamp?: number };
  /** Recent messages between you and the Bot, oldest first; undefined when Grok Bot hasn't cached the chat. */
  recentMessages?: ChatMessage[];
  /** Position in Grok Bot's sidebar: pinned Bots, then Bots outside sections, then each section in order. */
  sidebarOrder: number;
}

/** One message between you and a Bot, from Grok Bot's cached chat. */
export interface ChatMessage {
  id: string;
  from: "you" | "bot";
  text: string;
  timestamp: number;
}

export interface Roster {
  bots: Bot[];
  /** Mirrors Grok Bot's "send with ⌘↩" setting, so auto-send presses the right keys. */
  sendOnModEnter: boolean;
}

const KEY_PREFIX = "sand.client.slice.";
/** How many recent messages to keep per Bot for the details panel. */
const RECENT_MESSAGES = 10;
/** Longest message text kept per message, so the cached roster stays small. */
const MESSAGE_TEXT_LIMIT = 4000;
const BASE32 = "abcdefghijklmnopqrstuvwxyz234567";

export function defaultDataDir(): string {
  return path.join(os.homedir(), "Library", "Application Support", "Grok Bot");
}

function decodeBase32(input: string): string | null {
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of input.toLowerCase()) {
    const index = BASE32.indexOf(ch);
    if (index === -1) return null;
    value = ((value << 5) | index) & 0xfff;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes).toString("utf8");
}

interface Slice {
  key: string;
  file: string;
}

async function listSlices(dir: string): Promise<Slice[]> {
  const entries = await fs.readdir(dir);
  const slices: Slice[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".blob")) continue;
    const key = decodeBase32(entry.slice(0, -".blob".length));
    if (key?.startsWith(KEY_PREFIX)) slices.push({ key, file: path.join(dir, entry) });
  }
  return slices;
}

async function readSlice<T>(slice: Slice | undefined): Promise<T | undefined> {
  if (!slice) return undefined;
  try {
    const parsed = JSON.parse(await fs.readFile(slice.file, "utf8")) as { value?: T };
    return parsed.value;
  } catch {
    return undefined;
  }
}

interface Store {
  slices: Slice[];
  /** The slice `<account>.<suffix>` for the signed-in account. Never another account's. */
  forAccount: (suffix: string) => Promise<Slice | undefined>;
}

const ACCOUNT_KEY = new RegExp(`^${KEY_PREFIX.replace(/\./g, "\\.")}account\\.([^.]+)\\.`);

async function openStore(dataDir?: string): Promise<Store> {
  const dir = path.join(dataDir || defaultDataDir(), "sand-client-persistence");
  let slices: Slice[];
  try {
    slices = await listSlices(dir);
  } catch {
    throw new Error(`Couldn't read Grok Bot's data folder (${dir}). Is Grok Bot installed and signed in?`);
  }
  // Only ever read the signed-in account's data, even if another account's is still on disk.
  const accountId = await readSlice<string>(slices.find((s) => s.key === `${KEY_PREFIX}client-meta.account-slot`));
  let accountKey = accountId ? encodeURIComponent(accountId) : undefined;
  if (!accountKey) {
    const accounts = new Set(slices.map((s) => ACCOUNT_KEY.exec(s.key)?.[1]).filter(Boolean));
    if (accounts.size !== 1) {
      throw new Error("Couldn't tell which Grok Bot account is signed in. Open Grok Bot, sign in, and try again.");
    }
    accountKey = [...accounts][0];
  }
  const accountPrefix = `${KEY_PREFIX}account.${accountKey}.`;
  const forAccount = async (suffix: string) => slices.find((s) => s.key === accountPrefix + suffix);
  return { slices, forAccount };
}

interface RawEntry {
  id?: unknown;
  kind?: unknown;
  role?: unknown;
  content?: unknown;
  fromAgent?: unknown;
  toAgent?: unknown;
  timestampMs?: unknown;
  file_name?: unknown;
  message?: { type?: unknown; content?: unknown };
}

const SEND_TYPE_LABELS: Record<string, string> = {
  "email-draft": "Email draft",
  attachment: "Attachment",
  widget: "Question",
  "user-form": "Form",
  "auto-review-approval": "Approval",
  "cursor-agent": "Coding task",
};

/**
 * Keeps only the conversation between you and the Bot: your messages and files, and the
 * Bot's messages to you. Messages between Bots and app events are left out.
 */
function toChatMessages(entries: RawEntry[]): ChatMessage[] {
  const messages: ChatMessage[] = [];
  for (const entry of entries) {
    const id = str(entry.id);
    const timestamp = num(entry.timestampMs);
    if (entry.kind === "message" && entry.role === "user" && !entry.fromAgent) {
      const text = str(entry.content).trim();
      if (text) messages.push({ id, from: "you", text, timestamp });
    } else if (entry.kind === "user-attachment") {
      messages.push({ id, from: "you", text: `📎 ${str(entry.file_name) || "Attachment"}`, timestamp });
    } else if (entry.kind === "send-message" && entry.message) {
      const type = str(entry.message.type);
      const content = str(entry.message.content).trim();
      const label = SEND_TYPE_LABELS[type];
      const text = label ? (content ? `${label}: ${content}` : label) : content;
      if (text) messages.push({ id, from: "bot", text, timestamp });
    }
  }
  return messages;
}

async function readChat(store: Store, botId: string): Promise<ChatMessage[] | undefined> {
  const transcript = await readSlice<{ entries?: RawEntry[] }>(await store.forAccount(`transcript.replicas.${botId}`));
  return transcript?.entries ? toChatMessages(transcript.entries) : undefined;
}

/** Markdown and line breaks flattened into one line of plain text, for previews. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " [code] ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_~`>#|]+/g, "")
    .replace(/^\s*[-+]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

interface RawBot {
  id?: unknown;
  name?: unknown;
  avatarShape?: unknown;
  avatarColor?: unknown;
  lastActivityAt?: unknown;
  updatedAt?: unknown;
  unreadCount?: unknown;
  isHiddenFromSidebar?: unknown;
  isRemovedFromSidebar?: unknown;
  isGroup?: unknown;
  lastEntry?: { text?: unknown };
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export function cleanName(name: string): string {
  return name.replace(/^[^\p{L}\p{N}]+/u, "").trim() || name.trim();
}

export async function loadRoster(dataDir?: string): Promise<Roster> {
  const store = await openStore(dataDir);
  const { slices, forAccount } = store;

  const roster = await readSlice<{ rows?: RawBot[] }>(await forAccount("roster.last-roster"));
  if (!roster?.rows) {
    throw new Error("Grok Bot hasn't cached your Bots yet. Open Grok Bot, sign in, and try again.");
  }

  const sections = await readSlice<{ sections?: { name?: string; agentIds?: string[] }[] }>(
    await forAccount("sidebar.last-sections"),
  );
  const sectionByBot = new Map<string, string>();
  const sectionOrder = new Map<string, number>();
  for (const section of sections?.sections ?? []) {
    for (const id of section.agentIds ?? []) {
      sectionByBot.set(id, str(section.name));
      sectionOrder.set(id, sectionOrder.size);
    }
  }

  const refs = await readSlice<{ pinnedAgentIds?: string[] }>(await forAccount("ui-agent-refs"));
  const pinnedIds = refs?.pinnedAgentIds ?? [];
  const pinned = new Set(pinnedIds);

  const layout = await readSlice<{ isSendOnModEnter?: boolean }>(
    slices.find((s) => s.key === `${KEY_PREFIX}ui-layout`),
  );

  // Refuse a roster format we don't recognize rather than showing a partial list.
  const rows = roster.rows;
  if (!Array.isArray(rows) || rows.some((row) => typeof row?.id !== "string" || typeof row?.name !== "string")) {
    throw new Error("Grok Bot stores its Bot list in a format this extension doesn't recognize. Check for an update.");
  }
  const chats = await Promise.all(rows.map((row) => readChat(store, str(row.id))));

  const bots: Bot[] = rows
    .map((row, index) => {
      const chat = chats[index];
      const lastFromBot = chat?.findLast((m) => m.from === "bot");
      // No cached chat: fall back to Grok Bot's own preview of the chat's latest entry.
      const preview = plainText(str(row.lastEntry?.text));
      const lastMessage = lastFromBot
        ? { text: plainText(lastFromBot.text), timestamp: lastFromBot.timestamp }
        : !chat && preview
          ? { text: preview }
          : undefined;
      const name = str(row.name);
      const displayName = cleanName(name);
      return {
        id: str(row.id),
        name,
        displayName,
        firstName: displayName.split(/[\s·•|:–—-]+/u)[0] || displayName,
        avatarShape: str(row.avatarShape),
        avatarColor: str(row.avatarColor),
        lastActivityAt: num(row.lastActivityAt) || num(row.updatedAt),
        unreadCount: num(row.unreadCount),
        isHidden: row.isHiddenFromSidebar === true,
        isGroup: row.isGroup === true,
        isPinned: pinned.has(str(row.id)),
        section: sectionByBot.get(str(row.id)) || undefined,
        lastMessage,
        recentMessages: chat?.slice(-RECENT_MESSAGES).map((m) => ({ ...m, text: m.text.slice(0, MESSAGE_TEXT_LIMIT) })),
        sidebarOrder: 0,
      };
    })
    .sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || b.lastActivityAt - a.lastActivityAt);

  // Grok Bot's sidebar: pinned Bots in pin order, then Bots outside sections (most recent first),
  // then each section's Bots in their saved order.
  const sidebarRank = (bot: Bot) => {
    if (bot.isPinned) return pinnedIds.indexOf(bot.id);
    const inSection = sectionOrder.get(bot.id);
    return inSection === undefined ? 1_000 : 100_000 + inSection;
  };
  [...bots]
    .sort((a, b) => sidebarRank(a) - sidebarRank(b) || b.lastActivityAt - a.lastActivityAt)
    .forEach((bot, index) => (bot.sidebarOrder = index));

  return { bots, sendOnModEnter: layout?.isSendOnModEnter === true };
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/** Bots whose name has a word starting with every word of the query. */
export function filterBots(bots: Bot[], query: string): Bot[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return bots;
  return bots.filter((bot) => {
    const nameTokens = tokenize(bot.name);
    return queryTokens.every((q) => nameTokens.some((t) => t.startsWith(q)));
  });
}

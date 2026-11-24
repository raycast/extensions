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
}

export interface Roster {
  bots: Bot[];
  /** Mirrors Grok Bot's "send with ⌘↩" setting, so auto-send presses the right keys. */
  sendOnModEnter: boolean;
}

const KEY_PREFIX = "sand.client.slice.";
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

async function newest(slices: Slice[]): Promise<Slice | undefined> {
  let best: { slice: Slice; mtime: number } | undefined;
  for (const slice of slices) {
    const { mtimeMs } = await fs.stat(slice.file);
    if (!best || mtimeMs > best.mtime) best = { slice, mtime: mtimeMs };
  }
  return best?.slice;
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
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export function cleanName(name: string): string {
  return name.replace(/^[^\p{L}\p{N}]+/u, "").trim() || name.trim();
}

export async function loadRoster(dataDir?: string): Promise<Roster> {
  const dir = path.join(dataDir || defaultDataDir(), "sand-client-persistence");
  let slices: Slice[];
  try {
    slices = await listSlices(dir);
  } catch {
    throw new Error(`Couldn't read Grok Bot's data folder (${dir}). Is Grok Bot installed and signed in?`);
  }

  const accountId = await readSlice<string>(slices.find((s) => s.key === `${KEY_PREFIX}client-meta.account-slot`));
  const accountPrefix = accountId ? `${KEY_PREFIX}account.${encodeURIComponent(accountId)}.` : undefined;
  const forAccount = async (suffix: string) => {
    const exact = accountPrefix && slices.find((s) => s.key === accountPrefix + suffix);
    return exact || newest(slices.filter((s) => s.key.endsWith(`.${suffix}`)));
  };

  const roster = await readSlice<{ rows?: RawBot[] }>(await forAccount("roster.last-roster"));
  if (!roster?.rows) {
    throw new Error("Grok Bot hasn't cached your Bots yet. Open Grok Bot, sign in, and try again.");
  }

  const sections = await readSlice<{ sections?: { name?: string; agentIds?: string[] }[] }>(
    await forAccount("sidebar.last-sections"),
  );
  const sectionByBot = new Map<string, string>();
  for (const section of sections?.sections ?? []) {
    for (const id of section.agentIds ?? []) sectionByBot.set(id, str(section.name));
  }

  const refs = await readSlice<{ pinnedAgentIds?: string[] }>(await forAccount("ui-agent-refs"));
  const pinned = new Set(refs?.pinnedAgentIds ?? []);

  const layout = await readSlice<{ isSendOnModEnter?: boolean }>(
    slices.find((s) => s.key === `${KEY_PREFIX}ui-layout`),
  );

  const bots: Bot[] = roster.rows
    .filter((row) => typeof row.id === "string" && typeof row.name === "string")
    .map((row) => {
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
      };
    })
    .sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || b.lastActivityAt - a.lastActivityAt);

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

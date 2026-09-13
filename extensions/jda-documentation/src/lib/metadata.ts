import { environment } from "@raycast/api";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { CACHE_SCHEMA } from "./constants";
import { fetchPage } from "./pages";
import { writeFileAtomic } from "./storage";
import { DocEntry, EntryMeta, Inventory, MetaIndex } from "./types";

const META_TTL = 24 * 60 * 60 * 1000;
const SCAN_CONCURRENCY = 16;
const SECTION_LIMIT = 20000;

const TREE_PAGE = "overview-tree.html";
const PRESENCE_PAGE =
  "net/dv8tion/jda/api/events/user/update/GenericUserPresenceEvent.html";

// GatewayIntent.fromEvents walks this exact chain of isAssignableFrom checks
// and stops at the first match, so the order below is part of the data.
const EVENT_INTENT_RULES: { supertypes: string[]; intents: string[] }[] = [
  {
    supertypes: [
      "net.dv8tion.jda.api.events.user.update.GenericUserPresenceEvent",
    ],
    intents: ["GUILD_PRESENCES"],
  },
  {
    supertypes: [
      "net.dv8tion.jda.api.events.user.update.GenericUserUpdateEvent",
      "net.dv8tion.jda.api.events.guild.member.GenericGuildMemberEvent",
      "net.dv8tion.jda.api.events.guild.member.GuildMemberRemoveEvent",
    ],
    intents: ["GUILD_MEMBERS"],
  },
  {
    supertypes: [
      "net.dv8tion.jda.api.events.guild.GuildBanEvent",
      "net.dv8tion.jda.api.events.guild.GuildUnbanEvent",
      "net.dv8tion.jda.api.events.guild.GuildAuditLogEntryCreateEvent",
    ],
    intents: ["GUILD_MODERATION"],
  },
  {
    supertypes: [
      "net.dv8tion.jda.api.events.emoji.GenericEmojiEvent",
      "net.dv8tion.jda.api.events.sticker.GenericGuildStickerEvent",
    ],
    intents: ["GUILD_EXPRESSIONS"],
  },
  {
    supertypes: [
      "net.dv8tion.jda.api.events.guild.scheduledevent.update.GenericScheduledEventUpdateEvent",
    ],
    intents: ["SCHEDULED_EVENTS"],
  },
  {
    supertypes: [
      "net.dv8tion.jda.api.events.guild.invite.GenericGuildInviteEvent",
    ],
    intents: ["GUILD_INVITES"],
  },
  {
    supertypes: [
      "net.dv8tion.jda.api.events.guild.voice.GenericGuildVoiceEvent",
    ],
    intents: ["GUILD_VOICE_STATES"],
  },
  {
    supertypes: ["net.dv8tion.jda.api.events.message.MessageBulkDeleteEvent"],
    intents: ["GUILD_MESSAGES"],
  },
  {
    supertypes: [
      "net.dv8tion.jda.api.events.message.react.GenericMessageReactionEvent",
    ],
    intents: ["GUILD_MESSAGE_REACTIONS", "DIRECT_MESSAGE_REACTIONS"],
  },
  {
    supertypes: ["net.dv8tion.jda.api.events.message.GenericMessageEvent"],
    intents: ["GUILD_MESSAGES", "DIRECT_MESSAGES"],
  },
  {
    supertypes: ["net.dv8tion.jda.api.events.user.UserTypingEvent"],
    intents: ["GUILD_MESSAGE_TYPING", "DIRECT_MESSAGE_TYPING"],
  },
  {
    supertypes: ["net.dv8tion.jda.api.events.automod.AutoModExecutionEvent"],
    intents: ["AUTO_MODERATION_EXECUTION"],
  },
  {
    supertypes: ["net.dv8tion.jda.api.events.automod.GenericAutoModRuleEvent"],
    intents: ["AUTO_MODERATION_CONFIGURATION"],
  },
];

interface StoredMeta {
  fetchedAt: number;
  revision?: string;
  meta: MetaIndex;
}

function metaFile(): string {
  return path.join(environment.supportPath, `meta-${CACHE_SCHEMA}.json`);
}

function typeOf(page: string): string {
  return page.replace(/\.html$/, "").replace(/\//g, ".");
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function collect(html: string, pattern: RegExp): string[] {
  const found = new Set<string>();
  for (const match of html.matchAll(pattern)) found.add(match[1]);
  return [...found];
}

const INTENT_PATTERN = /GatewayIntent(?:\.html)?[#.]([A-Z][A-Z_]+)/g;
const PERMISSION_PATTERN = /Permission(?:\.html)?[#.]([A-Z][A-Z_]+)/g;
const SIGNATURE_PATTERN = /<div class="member-signature">([\s\S]*?)<\/div>/;
const RETURN_PATTERN =
  /<span class="return-type">([\s\S]*?)<\/span>\s*(?:&nbsp;)?/;

function describe(section: string): EntryMeta | null {
  const meta: EntryMeta = {};
  const signature = SIGNATURE_PATTERN.exec(section)?.[1] ?? "";

  if (signature.includes("@CheckReturnValue")) meta.queue = true;
  if (
    section.includes('class="deprecation-block"') ||
    signature.includes("@Deprecated")
  )
    meta.deprecated = true;

  const returns = stripTags(RETURN_PATTERN.exec(signature)?.[1] ?? "")
    .replace(/\s*([<>,])\s*/g, "$1")
    .replace(/,/g, ", ");
  if (returns) meta.returns = returns;

  const intents = collect(section, INTENT_PATTERN);
  if (intents.length) meta.intents = intents;

  const permissions = collect(section, PERMISSION_PATTERN);
  if (permissions.length) meta.permissions = permissions;

  return meta.queue || meta.deprecated || meta.intents || meta.permissions
    ? meta
    : null;
}

function scanPage(html: string, page: string, meta: MetaIndex): void {
  const owner = typeOf(page);
  const sections = [...html.matchAll(/<section class="detail" id="([^"]*)"/g)];

  for (let index = 0; index < sections.length; index++) {
    const start = sections[index].index ?? 0;
    const next = sections[index + 1]?.index ?? html.length;
    const end = Math.min(next, start + SECTION_LIMIT);

    const anchor = stripTags(sections[index][1]);
    const described = describe(html.slice(start, end));
    if (described) meta[`${owner}#${anchor}`] = described;
  }
}

function hrefToType(href: string, page: string): string | null {
  if (/^https?:/.test(href)) return null;
  try {
    const resolved = new URL(href, `https://docs.jda.wiki/${page}`).pathname;
    const type = resolved
      .replace(/^\//, "")
      .replace(/\.html$/, "")
      .replace(/\//g, ".");
    return type.startsWith("net.dv8tion.jda.") ? type : null;
  } catch {
    return null;
  }
}

function parseHierarchy(html: string): Map<string, string> {
  const parents = new Map<string, string>();
  const stack: (string | null)[] = [];
  let current: string | null = null;

  const token = /<ul[\s>]|<\/ul>|<li[^>]*>\s*[^<]*<a href="([^"]+)"/g;
  for (const match of html.matchAll(token)) {
    if (match[0].startsWith("</ul")) {
      current = stack.pop() ?? null;
      continue;
    }
    if (match[0].startsWith("<ul")) {
      stack.push(current);
      continue;
    }

    const type = hrefToType(match[1], TREE_PAGE);
    if (!type) {
      current = null;
      continue;
    }
    const parent = stack[stack.length - 1];
    if (parent) parents.set(type, parent);
    current = type;
  }

  return parents;
}

function parseImplementors(html: string): string[] {
  const marker = html.indexOf("All Known Implementing Classes");
  if (marker === -1) return [];
  const end = html.indexOf("</dd>", marker);
  return collect(
    html.slice(marker, end === -1 ? marker : end),
    /href="([^"]+\.html)"/g,
  )
    .map((href) => hrefToType(href, PRESENCE_PAGE))
    .filter((type): type is string => type !== null);
}

function ancestorsOf(type: string, parents: Map<string, string>): Set<string> {
  const chain = new Set<string>([type]);
  let cursor = parents.get(type);
  while (cursor && !chain.has(cursor)) {
    chain.add(cursor);
    cursor = parents.get(cursor);
  }
  return chain;
}

async function scanEvents(
  entries: DocEntry[],
  meta: MetaIndex,
  force: boolean,
): Promise<void> {
  const events = entries.filter((entry) => entry.kind === "event");
  if (!events.length) return;

  const parents = parseHierarchy(
    await fetchPage(TREE_PAGE, undefined, force, false),
  );
  const presence = new Set(
    parseImplementors(await fetchPage(PRESENCE_PAGE, undefined, force, false)),
  );

  for (const event of events) {
    const chain = ancestorsOf(event.name, parents);
    if (presence.has(event.name))
      chain.add(
        "net.dv8tion.jda.api.events.user.update.GenericUserPresenceEvent",
      );

    const rule = EVENT_INTENT_RULES.find((candidate) =>
      candidate.supertypes.some((supertype) => chain.has(supertype)),
    );
    if (!rule) continue;

    meta[event.name] = { ...meta[event.name], intents: rule.intents };
  }
}

function memberPages(entries: DocEntry[]): string[] {
  const pages = new Set<string>();
  for (const entry of entries) {
    if (entry.owner && entry.page) {
      pages.add(entry.page);
    }
  }
  return [...pages];
}

function restorePage(page: string, previous: MetaIndex, meta: MetaIndex): void {
  const owner = typeOf(page);
  const prefix = `${owner}#`;
  for (const [key, value] of Object.entries(previous)) {
    if (key === owner || key.startsWith(prefix)) {
      meta[key] = value;
    }
  }
}

async function scan(
  entries: DocEntry[],
  force: boolean,
  previous: MetaIndex = {},
): Promise<{ meta: MetaIndex; complete: boolean }> {
  const meta: MetaIndex = {};
  const pages = memberPages(entries);

  let next = 0;
  let failed = 0;
  async function worker(): Promise<void> {
    for (let at = next++; at < pages.length; at = next++) {
      try {
        const html = await fetchPage(pages[at], undefined, force, false);
        scanPage(html, pages[at], meta);
      } catch {
        failed += 1;
        restorePage(pages[at], previous, meta);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(SCAN_CONCURRENCY, pages.length) }, worker),
  );

  try {
    await scanEvents(entries, meta, force);
  } catch {
    failed += 1;
    for (const entry of entries) {
      if (entry.kind === "event" && previous[entry.name]?.intents) {
        meta[entry.name] = {
          ...meta[entry.name],
          intents: previous[entry.name].intents,
        };
      }
    }
  }

  return { meta, complete: failed === 0 };
}

async function readStored(): Promise<StoredMeta | null> {
  try {
    return JSON.parse(await readFile(metaFile(), "utf8")) as StoredMeta;
  } catch {
    return null;
  }
}

// Member pages only change when the documentation is republished, so a complete
// scan taken at the inventory's revision stays valid until that revision moves.
function isCurrent(
  stored: StoredMeta,
  inventory: Inventory,
  force: boolean,
): boolean {
  if (stored.revision && inventory.revision)
    return stored.revision === inventory.revision;
  return !force && Date.now() - stored.fetchedAt < META_TTL;
}

// Held for the lifetime of the process for the same reason as the inventory:
// every search, filter and AI tool call otherwise re-reads and re-parses it.
let memoryMeta: StoredMeta | null = null;
let pending: { key: string; promise: Promise<MetaIndex> } | null = null;

async function rebuild(
  inventory: Inventory,
  force: boolean,
): Promise<MetaIndex> {
  const stored = await readStored();
  if (stored && isCurrent(stored, inventory, force)) {
    memoryMeta = stored;
    return stored.meta;
  }

  const previous = memoryMeta ?? stored;
  if (!inventory.entries.length) return previous?.meta ?? {};

  try {
    const { meta, complete } = await scan(
      inventory.entries,
      force,
      previous?.meta,
    );
    if (complete) {
      memoryMeta = {
        fetchedAt: Date.now(),
        revision: inventory.revision,
        meta,
      };
      await writeFileAtomic(metaFile(), JSON.stringify(memoryMeta)).catch(
        () => undefined,
      );
    } else if (!memoryMeta) {
      memoryMeta = { fetchedAt: previous?.fetchedAt ?? 0, meta };
    }
    return meta;
  } catch {
    return previous?.meta ?? {};
  }
}

// The list and a refresh can ask at the same moment; one scan of 859 pages
// has to serve both instead of running twice side by side.
export async function ensureMeta(
  inventory: Inventory,
  force = false,
): Promise<MetaIndex> {
  if (memoryMeta && isCurrent(memoryMeta, inventory, force))
    return memoryMeta.meta;

  const key = inventory.revision || String(inventory.fetchedAt);
  if (pending) {
    if (pending.key === key) return pending.promise;
    await pending.promise.catch(() => undefined);
    return ensureMeta(inventory, force);
  }

  const promise = rebuild(inventory, force).finally(() => {
    pending = null;
  });
  pending = { key, promise };
  return promise;
}

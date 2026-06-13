import { getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import {
  chmod,
  copyFile,
  mkdir,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { scriptIconFileNames, scriptIconForItem } from "./lark-icons";
import { getRecents } from "./recent-cache";
import { LarkSearchItem, LarkSearchType } from "./types";

const execFileAsync = promisify(execFile);
const DEFAULT_LARK_BUNDLE_ID = "com.larksuite.larkApp";
const DEFAULT_LARK_CLI_PATH = "/opt/homebrew/bin/lark-cli";
const DEFAULT_HOT_INDEX_DIRECTORY =
  "~/Documents/Raycast Script Commands/Lark Hot Index";

type Preferences = {
  hotIndexDirectory?: string;
  hotIndexLimit?: string;
  larkBundleId?: string;
  larkCliPath?: string;
};

type HotIndexItem = LarkSearchItem & {
  hotScore: number;
};

export function getHotIndexDirectory() {
  const { hotIndexDirectory } = getPreferenceValues<Preferences>();
  return expandHome(hotIndexDirectory || DEFAULT_HOT_INDEX_DIRECTORY);
}

export async function refreshHotIndex() {
  const { hotIndexLimit } = getPreferenceValues<Preferences>();
  const limit = Math.max(1, Number.parseInt(hotIndexLimit ?? "", 10) || 50);
  const items = await collectHotIndexItems();
  await writeHotIndex(items.slice(0, limit));
  return {
    count: Math.min(items.length, limit),
    directory: getHotIndexDirectory(),
  };
}

export async function upsertOpenedItemInHotIndex(item: LarkSearchItem) {
  const recents = await getRecents();
  const existing = recents.map(toRecentHotItem);
  const opened = toRecentHotItem(item);
  const merged = dedupeHotItems([opened, ...existing]);
  const { hotIndexLimit } = getPreferenceValues<Preferences>();
  const limit = Math.max(1, Number.parseInt(hotIndexLimit ?? "", 10) || 50);
  await writeHotIndex(merged.slice(0, limit));
}

async function collectHotIndexItems() {
  const [recents, activeChats, feedShortcuts, flags] = await Promise.all([
    getRecents().then((items) => items.map(toRecentHotItem)),
    getActiveChats().catch(() => []),
    getFeedShortcuts().catch(() => []),
    getFlaggedMessages().catch(() => []),
  ]);

  return dedupeHotItems([
    ...enrichWithActiveChats(feedShortcuts, activeChats),
    ...enrichWithActiveChats(recents, activeChats),
    ...activeChats,
    ...flags,
  ]).sort((a, b) => b.hotScore - a.hotScore);
}

function toRecentHotItem(item: LarkSearchItem): HotIndexItem {
  const lastOpenedAt = Date.parse(item.lastOpenedAt ?? "");
  const recencyScore = Number.isFinite(lastOpenedAt)
    ? Math.max(0, 250 - (Date.now() - lastOpenedAt) / 1000 / 60 / 60)
    : 0;

  return {
    ...item,
    hotScore: 500 + item.openCount * 80 + recencyScore,
  };
}

async function getActiveChats(): Promise<HotIndexItem[]> {
  const output = await runLarkCli([
    "im",
    "+chat-list",
    "--as",
    "user",
    "--types",
    "group,p2p",
    "--sort-type",
    "ByActiveTimeDesc",
    "--page-size",
    "80",
    "--json",
  ]);
  const chats = extractArray(output, ["data.chats", "chats"]);

  return chats.map((raw, index) => {
    const title = pickString(raw, ["name"]) ?? `Chat ${index + 1}`;
    const chatId = pickString(raw, ["chat_id", "id"]);
    const mode = pickString(raw, ["chat_mode"]);
    const type: LarkSearchType = mode === "p2p" ? "contact" : "chat";

    return {
      id: `active-chat:${chatId ?? title}`,
      type,
      title: cleanText(title) ?? title,
      subtitle: cleanText(
        [
          mode === "p2p" ? "最近活跃私聊" : "最近活跃群组",
          pickString(raw, ["description"]),
          pickString(raw, ["update_time", "updated_at", "active_time"]),
        ]
          .filter(Boolean)
          .join(" · "),
      ),
      url: chatId
        ? `https://applink.feishu.cn/client/chat/open?openChatId=${encodeURIComponent(chatId)}`
        : undefined,
      updatedAt: undefined,
      openCount: 0,
      rankScore: 0,
      hotScore: 850 - index,
      source: "live",
      raw,
    };
  });
}

async function getFeedShortcuts(): Promise<HotIndexItem[]> {
  const output = await runLarkCli([
    "im",
    "+feed-shortcut-list",
    "--as",
    "user",
    "--json",
  ]);
  const shortcuts = extractArray(output, [
    "data.shortcuts",
    "data.items",
    "shortcuts",
    "items",
  ]);

  return shortcuts.map((raw, index) => {
    const detail = pick(raw, "detail") ?? raw;
    const chatId =
      pickString(raw, ["feed_card_id", "chat_id"]) ??
      pickString(detail, ["chat_id"]);
    const mode = pickString(detail, ["chat_mode"]);
    const title =
      pickString(detail, ["name"]) ?? chatId ?? `Pinned Chat ${index + 1}`;
    const type: LarkSearchType = mode === "p2p" ? "contact" : "chat";

    return {
      id: `feed-shortcut:${chatId ?? title}`,
      type,
      title: cleanText(title) ?? title,
      subtitle: cleanText(
        ["飞书置顶会话", pickString(detail, ["description"])]
          .filter(Boolean)
          .join(" · "),
      ),
      url: chatId
        ? `https://applink.feishu.cn/client/chat/open?openChatId=${encodeURIComponent(chatId)}`
        : undefined,
      updatedAt: undefined,
      openCount: 0,
      rankScore: 0,
      hotScore: 1200 - index,
      source: "live",
      raw,
    };
  });
}

function enrichWithActiveChats(
  items: HotIndexItem[],
  activeChats: HotIndexItem[],
) {
  return items.map((feedItem) => {
    const activeMatch = activeChats.find(
      (activeItem) => activeItem.url === feedItem.url,
    );
    if (!activeMatch) {
      return feedItem;
    }

    return {
      ...activeMatch,
      id: feedItem.id,
      hotScore: feedItem.hotScore,
      subtitle: cleanText(
        [feedItem.subtitle, activeMatch.subtitle].filter(Boolean).join(" · "),
      ),
      raw: { source: feedItem.raw, active: activeMatch.raw },
    };
  });
}

async function getFlaggedMessages(): Promise<HotIndexItem[]> {
  const output = await runLarkCli([
    "im",
    "+flag-list",
    "--as",
    "user",
    "--page-size",
    "20",
    "--json",
    "--enrich-feed-thread=false",
  ]);
  const flags = extractArray(output, [
    "data.items",
    "data.flags",
    "data.messages",
    "items",
    "flags",
    "messages",
  ]);

  return flags.map((raw, index) => {
    const title =
      pickString(raw, [
        "title",
        "chat_name",
        "message.content",
        "content",
        "text",
        "summary",
      ]) ?? `Flagged Message ${index + 1}`;
    const chatId = pickString(raw, ["chat_id", "message.chat_id"]);
    const position = pickString(raw, [
      "message_position",
      "position",
      "message.message_position",
    ]);
    const url =
      pickString(raw, ["message_app_link", "url", "link"]) ??
      (chatId
        ? `https://applink.feishu.cn/client/chat/open?openChatId=${encodeURIComponent(chatId)}${position ? `&position=${encodeURIComponent(position)}` : ""}`
        : undefined);

    return {
      id: `flag:${pickString(raw, ["id", "message_id", "message.message_id"]) ?? title}`,
      type: "message",
      title: cleanText(title) ?? title,
      subtitle: cleanText(
        [
          "收藏消息",
          pickString(raw, ["chat_name", "sender.name"]),
          pickString(raw, [
            "create_time",
            "update_time",
            "message.create_time",
          ]),
        ]
          .filter(Boolean)
          .join(" · "),
      ),
      snippet: cleanText(
        pickString(raw, ["message.content", "content", "text", "summary"]),
      ),
      url,
      updatedAt: undefined,
      openCount: 0,
      rankScore: 0,
      hotScore: 750 - index,
      source: "live",
      raw,
    };
  });
}

async function runLarkCli(args: string[]) {
  const { larkCliPath } = getPreferenceValues<Preferences>();
  const { stdout } = await execFileAsync(
    larkCliPath || DEFAULT_LARK_CLI_PATH,
    args,
    {
      timeout: 15000,
      maxBuffer: 1024 * 1024 * 5,
      env: process.env,
    },
  );
  const parsed = JSON.parse(stdout) as { ok?: boolean; data?: unknown };
  if (parsed.ok === false) {
    throw new Error("lark-cli command failed");
  }
  return parsed;
}

async function writeHotIndex(items: HotIndexItem[]) {
  const directory = getHotIndexDirectory();
  await mkdir(directory, { recursive: true });
  await syncScriptAssets(directory);
  await removeExistingScripts(directory);

  await Promise.all(
    items
      .filter((item) => item.url)
      .map(async (item, index) => {
        const filename = `lark-hot-index-${pad(index + 1)}.sh`;
        const filePath = join(directory, filename);
        await writeFile(filePath, scriptContent(item), "utf8");
        await chmod(filePath, 0o755);
      }),
  );
}

async function syncScriptAssets(directory: string) {
  const assetsDirectory = join(directory, ".assets");
  await mkdir(assetsDirectory, { recursive: true });
  await Promise.all(
    scriptIconFileNames.map((filename) =>
      copyFile(
        join(__dirname, "assets", filename),
        join(assetsDirectory, filename),
      ),
    ),
  );
}

async function removeExistingScripts(directory: string) {
  const entries = await readdir(directory).catch(() => []);
  await Promise.all(
    entries
      .filter((entry) => entry.endsWith(".sh"))
      .map((entry) => rm(join(directory, entry), { force: true })),
  );
}

function scriptContent(item: HotIndexItem) {
  const { larkBundleId } = getPreferenceValues<Preferences>();
  const command = shouldOpenInLark(item)
    ? `open -b ${shellQuote(larkBundleId || DEFAULT_LARK_BUNDLE_ID)} ${shellQuote(item.url ?? "")}`
    : `open ${shellQuote(item.url ?? "")}`;

  return [
    "#!/bin/bash",
    "# Required parameters:",
    "# @raycast.schemaVersion 1",
    `# @raycast.title ${scriptTitle(item)}`,
    "# @raycast.mode silent",
    `# @raycast.packageName ${scriptPackageName(item)}`,
    `# @raycast.icon ${scriptIconForItem(item)}`,
    `# @raycast.description ${scriptDescription(item)}`,
    "",
    command,
    "",
  ].join("\n");
}

function scriptTitle(item: HotIndexItem) {
  return item.title;
}

function scriptDescription(item: HotIndexItem) {
  return (
    cleanText(
      [
        item.subtitle,
        item.snippet,
        item.updatedAt,
        pickString(item.raw, [
          "department",
          "department_name",
          "enterprise_email",
          "email",
          "description",
          "result_meta.owner_name",
          "result_meta.update_time_iso",
          "owner_name",
          "active.description",
          "active.update_time",
          "source.description",
          "source.update_time",
          "chat_name",
          "sender.name",
          "create_time",
          "update_time",
        ]),
      ]
        .filter(Boolean)
        .join(" · "),
    ) ?? scriptTitle(item)
  );
}

function scriptPackageName(item: HotIndexItem) {
  const context = scriptDescription(item);
  const type =
    item.type === "message"
      ? "Msg"
      : item.type === "doc" || item.type === "wiki" || item.type === "sheet"
        ? "Doc"
        : "Chat";

  return shorten(
    cleanText([`Lark ${type}`, context].filter(Boolean).join(" · ")) ??
      `Lark ${type}`,
    90,
  );
}

function shouldOpenInLark(item: LarkSearchItem) {
  return (
    item.type === "chat" || item.type === "message" || item.type === "contact"
  );
}

function dedupeHotItems(items: HotIndexItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.url ?? item.id;
    if (seen.has(key) || !item.url) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function extractArray(data: unknown, paths: string[]) {
  for (const path of paths) {
    const value = pick(data, path);
    if (Array.isArray(value)) {
      return value;
    }
  }
  return [];
}

function pickString(value: unknown, paths: string[]) {
  for (const path of paths) {
    const picked = pick(value, path);
    if (typeof picked === "string" && picked.trim()) {
      return picked;
    }
    if (typeof picked === "number" || typeof picked === "boolean") {
      return String(picked);
    }
  }
  return undefined;
}

function pick(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    return (current as Record<string, unknown>)[key];
  }, value);
}

function cleanText(value?: string) {
  return value
    ?.replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function pad(value: number) {
  return String(value).padStart(3, "0");
}

function expandHome(path: string) {
  if (path === "~") {
    return process.env.HOME || path;
  }

  if (path.startsWith("~/")) {
    return join(process.env.HOME || "", path.slice(2));
  }

  return path;
}

function shorten(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  AppTarget,
  getLarkCliIdentities,
  getLarkCliPath,
  getEnabledAppTargets,
  withCliIdentity,
} from "./preferences";
import { LarkSearchItem, LarkSearchType, SearchScopeFilter } from "./types";

const execFileAsync = promisify(execFile);

type LarkCommand = {
  type: LarkSearchType;
  args: string[];
  pageAllArgs?: string[];
  pageSizeArgs?: string[];
  pageTokenArg?: string;
  maxPages?: number;
};

type SearchResponse = {
  ok?: boolean;
  data?: unknown;
  error?: string;
  message?: string;
};

type SearchPage = {
  items: LarkSearchItem[];
  nextPageToken?: string;
  hasMore: boolean;
};

const commandByScope: Record<LarkSearchType, LarkCommand[]> = {
  doc: [
    {
      type: "doc",
      args: ["docs", "+search"],
      pageSizeArgs: ["--page-size", "20"],
      pageTokenArg: "--page-token",
      maxPages: 5,
    },
  ],
  wiki: [
    {
      type: "wiki",
      args: ["docs", "+search"],
      pageSizeArgs: ["--page-size", "20"],
      pageTokenArg: "--page-token",
      maxPages: 5,
    },
  ],
  sheet: [
    {
      type: "sheet",
      args: ["docs", "+search"],
      pageSizeArgs: ["--page-size", "20"],
      pageTokenArg: "--page-token",
      maxPages: 5,
    },
  ],
  message: [
    {
      type: "message",
      args: ["im", "+messages-search", "--no-reactions"],
      pageAllArgs: ["--page-all", "--page-limit", "10", "--page-size", "50"],
    },
  ],
  chat: [
    {
      type: "chat",
      args: ["im", "+chat-search"],
      pageSizeArgs: ["--page-size", "100"],
      pageTokenArg: "--page-token",
      maxPages: 3,
    },
  ],
  contact: [
    {
      type: "contact",
      args: ["contact", "+search-user"],
      pageSizeArgs: ["--page-size", "30"],
    },
  ],
};

export async function searchLark(
  query: string,
  scopes: SearchScopeFilter,
): Promise<LarkSearchItem[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const commands = scopes.flatMap((scope) => commandByScope[scope]);
  const targets = getEnabledAppTargets();
  const searchTargets =
    targets.length > 0
      ? targets
      : [
          {
            key: "lark" as const,
            productName: "Lark" as const,
            name: "Lark",
            bundleId: "com.larksuite.larkApp",
            cliIdentity: getLarkCliIdentities()[0] ?? "user",
          },
        ];
  const settled = await Promise.allSettled(
    searchTargets.flatMap((target) =>
      commands.map((command) => runSearchCommand(command, trimmed, target)),
    ),
  );

  const results = settled.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );
  return results.sort((a, b) => b.rankScore - a.rankScore);
}

async function runSearchCommand(
  command: LarkCommand,
  query: string,
  target: AppTarget,
): Promise<LarkSearchItem[]> {
  if (command.pageAllArgs) {
    return runSingleSearchPage(
      command,
      query,
      target,
      command.pageAllArgs,
    ).then((page) => page.items);
  }

  if (command.pageTokenArg) {
    return runPaginatedSearchCommand(command, query, target);
  }

  return runSingleSearchPage(command, query, target).then((page) => page.items);
}

async function runSingleSearchPage(
  command: LarkCommand,
  query: string,
  target: AppTarget,
  extraArgs: string[] = command.pageSizeArgs ?? [],
): Promise<SearchPage> {
  const { stdout } = await execFileAsync(
    getLarkCliPath(),
    withCliIdentity(
      [...command.args, ...extraArgs, "--query", query, "--json"],
      target.cliIdentity,
    ),
    {
      timeout: command.type === "message" ? 15000 : 10000,
      maxBuffer: 1024 * 1024 * 20,
      env: process.env,
    },
  );

  const parsed = JSON.parse(stdout) as SearchResponse;
  if (parsed.ok === false) {
    throw new Error(parsed.error ?? parsed.message ?? "lark-cli search failed");
  }

  return {
    items: extractItems(parsed.data, command.type).map((raw, index) =>
      normalizeItem(raw, command.type, index, target),
    ),
    nextPageToken: pickString(parsed.data, ["page_token"]),
    hasMore: pickString(parsed.data, ["has_more"]) === "true",
  };
}

async function runPaginatedSearchCommand(
  command: LarkCommand,
  query: string,
  target: AppTarget,
): Promise<LarkSearchItem[]> {
  const items: LarkSearchItem[] = [];
  let pageToken: string | undefined;
  const maxPages = command.maxPages ?? 1;

  for (let page = 0; page < maxPages; page += 1) {
    const extraArgs = [
      ...(command.pageSizeArgs ?? []),
      ...(pageToken ? [command.pageTokenArg as string, pageToken] : []),
    ];
    const searchPage = await runSingleSearchPage(
      command,
      query,
      target,
      extraArgs,
    );
    items.push(...searchPage.items);

    if (!searchPage.hasMore || !searchPage.nextPageToken) {
      break;
    }
    pageToken = searchPage.nextPageToken;
  }

  return items.map((item, index) => ({ ...item, rankScore: 100 - index }));
}

function extractItems(data: unknown, type: LarkSearchType): unknown[] {
  if (!data || typeof data !== "object") {
    return [];
  }

  const record = data as Record<string, unknown>;
  const candidates = [
    record.results,
    record.items,
    record.docs,
    record.files,
    record.messages,
    record.chats,
    record.users,
    record[type],
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function normalizeItem(
  raw: unknown,
  type: LarkSearchType,
  index: number,
  target: AppTarget,
): LarkSearchItem {
  const titleHighlighted = pickString(raw, ["title_highlighted"]);
  const summaryHighlighted = pickString(raw, ["summary_highlighted"]);
  const content = pickString(raw, ["content", "message.content", "text"]);
  const chatName = pickString(raw, ["chat_name", "name"]);
  const senderName = pickString(raw, ["sender.name", "user.name"]);
  const title =
    stripHighlight(titleHighlighted) ??
    pickString(raw, [
      "result_meta.title",
      "title",
      "name",
      "display_name",
      "chat_name",
      "localized_name",
      "sender.name",
      "user.name",
      "message.content",
      "content",
      "text",
    ]) ??
    `${fallbackTitle(type)} ${index + 1}`;

  const id =
    pickString(raw, [
      "id",
      "result_meta.token",
      "token",
      "doc_token",
      "file_token",
      "wiki_token",
      "message_id",
      "message.message_id",
      "chat_id",
      "open_id",
      "user_id",
      "union_id",
      "url",
      "link",
    ]) ?? `${type}:${title}:${index}`;

  const url =
    pickString(raw, [
      "result_meta.url",
      "message_app_link",
      "url",
      "link",
      "web_url",
      "doc_url",
      "app_link",
      "share_url",
      "message.url",
    ]) ?? buildFallbackUrl(type, raw);
  const itemType = inferType(type, raw);
  const subtitle = buildSubtitle(raw, itemType, chatName, senderName);
  const snippet =
    stripHighlight(summaryHighlighted) ??
    cleanText(
      pickString(raw, [
        "snippet",
        "summary",
        "abstract",
        "description",
        "message.content",
        "content",
        "text",
      ]),
    );

  return {
    id: `${target.key}:${type}:${id}`,
    type: itemType,
    title: cleanText(title) ?? title,
    subtitle,
    snippet,
    detailMarkdown: buildDetailMarkdown({
      title,
      titleHighlighted,
      summaryHighlighted,
      content,
      subtitle,
      url,
      type: itemType,
    }),
    url,
    updatedAt: pickString(raw, [
      "updated_at",
      "update_time",
      "result_meta.update_time_iso",
      "modified_time",
      "message.create_time",
      "create_time",
    ]),
    appTargetKey: target.key,
    appName: target.productName,
    applicationName: target.name,
    bundleId: target.bundleId,
    openCount: 0,
    rankScore: 100 - index,
    source: "live",
    raw,
  };
}

function inferType(type: LarkSearchType, raw: unknown): LarkSearchType {
  if (type !== "doc" && type !== "wiki" && type !== "sheet") {
    return type;
  }

  const objectType = pickString(raw, [
    "entity_type",
    "type",
    "result_meta.doc_types",
    "doc_type",
    "result_meta.file_type",
    "file_type",
    "resource_type",
  ])?.toLowerCase();
  if (!objectType) {
    return type;
  }

  if (objectType.includes("wiki")) {
    return "wiki";
  }
  if (
    objectType.includes("sheet") ||
    objectType.includes("bitable") ||
    objectType.includes("table")
  ) {
    return "sheet";
  }
  return "doc";
}

function buildFallbackUrl(type: LarkSearchType, raw: unknown) {
  if (type === "chat") {
    const chatId = pickString(raw, ["chat_id", "id"]);
    return chatId
      ? `https://applink.feishu.cn/client/chat/open?openChatId=${encodeURIComponent(chatId)}`
      : undefined;
  }

  if (type === "contact") {
    const chatId = pickString(raw, ["p2p_chat_id"]);
    return chatId
      ? `https://applink.feishu.cn/client/chat/open?openChatId=${encodeURIComponent(chatId)}`
      : undefined;
  }

  return undefined;
}

function buildSubtitle(
  raw: unknown,
  type: LarkSearchType,
  chatName?: string,
  senderName?: string,
) {
  if (type === "message") {
    return cleanText(
      [chatName, senderName, pickString(raw, ["create_time", "update_time"])]
        .filter(Boolean)
        .join(" · "),
    );
  }

  if (type === "doc" || type === "wiki" || type === "sheet") {
    return cleanText(
      [
        pickString(raw, ["result_meta.owner_name", "owner_name"]),
        pickString(raw, ["result_meta.update_time_iso", "update_time"]),
      ]
        .filter(Boolean)
        .join(" · "),
    );
  }

  if (type === "contact") {
    return cleanText(
      [
        pickString(raw, ["department", "department_name"]),
        pickString(raw, ["enterprise_email", "email"]),
      ]
        .filter(Boolean)
        .join(" · "),
    );
  }

  return cleanText(
    pickString(raw, [
      "subtitle",
      "description",
      "owner.name",
      "department_name",
      "email",
      "enterprise_email",
    ]),
  );
}

function buildDetailMarkdown({
  title,
  titleHighlighted,
  summaryHighlighted,
  content,
  subtitle,
  url,
  type,
}: {
  title: string;
  titleHighlighted?: string;
  summaryHighlighted?: string;
  content?: string;
  subtitle?: string;
  url?: string;
  type: LarkSearchType;
}) {
  const highlightedTitle =
    highlightToMarkdown(titleHighlighted) ?? escapeMarkdown(title);
  const context =
    highlightToMarkdown(summaryHighlighted) ?? escapeMarkdown(content);
  const rows = [`## ${highlightedTitle}`];

  if (subtitle) {
    rows.push(escapeMarkdown(subtitle) ?? subtitle);
  }

  if (context) {
    rows.push(
      "",
      type === "message" ? "### 消息上下文" : "### 命中上下文",
      context,
    );
  }

  if (url) {
    rows.push("", `[打开链接](${url})`);
  }

  return rows.join("\n\n");
}

function pickString(value: unknown, paths: string[]) {
  for (const path of paths) {
    const picked = pick(value, path);
    const normalized = stringifyValue(picked);
    if (normalized) {
      return normalized;
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

function stringifyValue(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      stringifyValue(record.name) ??
      stringifyValue(record.zh_cn) ??
      stringifyValue(record.en_us)
    );
  }

  return undefined;
}

function cleanText(value?: string) {
  return decodeHtmlEntities(value)?.replace(/\s+/g, " ").trim();
}

function stripHighlight(value?: string) {
  return cleanText(value?.replaceAll("<h>", "").replaceAll("</h>", ""));
}

function highlightToMarkdown(value?: string) {
  const cleaned = value
    ?.replaceAll("<h>", "**")
    .replaceAll("</h>", "**")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return cleaned || undefined;
}

function escapeMarkdown(value?: string) {
  return value
    ?.replace(/([\\`*_{}[\]()#+.!|-])/g, "\\$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeHtmlEntities(value?: string) {
  return value
    ?.replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 10)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    );
}

function fallbackTitle(type: LarkSearchType) {
  switch (type) {
    case "message":
      return "Message";
    case "chat":
      return "Chat";
    case "contact":
      return "Contact";
    case "wiki":
      return "Wiki";
    case "sheet":
      return "Sheet";
    case "doc":
      return "Document";
  }
}

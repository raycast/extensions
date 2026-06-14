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
import {
  extractArray,
  parseJsonOrThrow,
  pickString,
  unique,
} from "./object-utils";
import { normalizeSearchItem } from "./search-normalizer";

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

  if (results.length === 0 && settled.every(isRejected)) {
    throw new Error(
      formatSearchFailure(settled.map((result) => result.reason)),
    );
  }

  return results.sort((a, b) => b.rankScore - a.rankScore);
}

function isRejected<T>(
  result: PromiseSettledResult<T>,
): result is PromiseRejectedResult {
  return result.status === "rejected";
}

function formatSearchFailure(reasons: unknown[]) {
  const messages = unique(
    reasons.map(errorMessage).filter((message) => message.length > 0),
  );
  const detail = messages.slice(0, 2).join("; ");

  return detail
    ? `Lark-cli search failed: ${detail}`
    : "Lark-cli search failed";
}

function errorMessage(reason: unknown) {
  if (reason instanceof Error) {
    return reason.message;
  }

  return typeof reason === "string" ? reason : "";
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

  const parsed = parseJsonOrThrow<SearchResponse>(stdout, "Lark-cli search");
  if (parsed.ok === false) {
    throw new Error(parsed.error ?? parsed.message ?? "Lark-cli search failed");
  }

  return {
    items: extractItems(parsed.data, command.type).map((raw, index) =>
      normalizeSearchItem(raw, command.type, index, target),
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
  return extractArray(data, [
    "results",
    "items",
    "docs",
    "files",
    "messages",
    "chats",
    "users",
    type,
  ]);
}

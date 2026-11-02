import { type Account, clearTokens, DEFAULT_SERVER, listAccounts, updateAccount } from "./accounts";
import { accessToken, SignedOutError, signIn } from "./auth";

// Everything goes through Hackban's MCP tools (src/server/mcp.ts in hackban): they run the same
// tRPC procedures as the web app, so permissions, activity and live updates match. The endpoint
// is stateless, so each call is a single JSON-RPC request with no session to set up.

export type Me = { id: string; name: string | null; email: string | null; username: string | null };

export type Workspace = {
  id: string;
  name: string;
  boards: { id: string; name: string; starred: boolean; url: string }[];
};

export type CardSummary = {
  id: string;
  title: string;
  due?: string;
  dueComplete?: boolean;
  board: string;
  list: string;
  labels?: string[];
  url: string;
};

export type BoardCard = {
  id: string;
  title: string;
  due?: string;
  dueComplete?: boolean;
  labels?: string[];
  members?: string[];
  checklist?: string;
  comments?: number;
};

export type BoardList = { id: string; name: string; color?: string; cards: BoardCard[] };

export type Board = {
  id: string;
  name: string;
  url: string;
  workspace: { id: string; name: string } | null;
  myRole: string;
  labels: { id: string; name: string; color: string | null }[];
  members: { id: string; name: string | null; username: string | null; role: string; pending?: string }[];
  lists: BoardList[];
};

type Dependency = { id: string; title: string; dueComplete: boolean };

export type Card = {
  id: string;
  title: string;
  url: string;
  board: { id: string; name: string };
  list: { id: string; name: string };
  description: string;
  start: string | null;
  due: string | null;
  dueComplete: boolean;
  recurrence: string | null;
  archived: boolean;
  labels: { id: string; name: string; color: string | null }[];
  members: { id: string; name: string | null }[];
  checklists: { id: string; name: string; items: { id: string; name: string; complete: boolean }[] }[];
  attachments: { name: string; url: string }[];
  comments: { id: string; author: string | null; text: string; at: string }[];
  blockedBy?: Dependency[];
  blocking?: Dependency[];
};

export type SearchResult = {
  boards: { id: string; name: string; url: string }[];
  cards: { id: string; title: string; archived: boolean; board: string; list: string; url: string }[];
};

export type Notification = {
  type: string;
  read: boolean;
  at: string;
  cardId?: string;
  title?: string;
  boardId?: string;
  by?: string;
  text?: string;
  url?: string;
};

type RpcResponse = {
  result?: { content?: { type: string; text?: string }[]; isError?: boolean };
  error?: { message: string };
};

let rpcId = 0;

function post(account: Account, token: string, name: string, args: Record<string, unknown>) {
  return fetch(`${account.server}/api/mcp`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "MCP-Protocol-Version": "2025-06-18",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method: "tools/call", params: { name, arguments: args } }),
  });
}

/** Calls a Hackban MCP tool as `account` and parses the JSON it returns. */
async function callTool<T>(account: Account, name: string, args: Record<string, unknown> = {}): Promise<T> {
  let res = await post(account, await accessToken(account), name, args);
  // Revoked or expired early: refresh once, and if that's turned down too, it needs signing in again.
  if (res.status === 401) res = await post(account, await accessToken(account, true), name, args);
  if (res.status === 401) {
    await clearTokens(account.id);
    throw new SignedOutError(account);
  }
  if (!res.ok) throw new Error(`${account.label} returned ${res.status}`);
  const body = (await res.json()) as RpcResponse;
  if (body.error) throw new Error(body.error.message);
  const text = body.result?.content?.find((c) => c.type === "text")?.text ?? "null";
  if (body.result?.isError) throw new Error(text);
  return JSON.parse(text) as T;
}

type Ok = { ok: true };

/** Hackban's tools, acting as `account`. */
export function api(account: Account) {
  const call = <T>(name: string, args?: Record<string, unknown>) => callTool<T>(account, name, args);
  return {
    whoami: () => call<Me>("whoami"),
    workspaces: () => call<Workspace[]>("list_workspaces"),
    search: (query: string) => call<SearchResult>("search", { query }),
    board: (boardId: string) => call<Board>("get_board", { boardId }),
    card: (cardId: string) => call<Card>("get_card", { cardId }),
    myCards: () => call<CardSummary[]>("my_cards"),
    notifications: (markRead = false) => call<Notification[]>("notifications", { markRead }),
    createCard: (input: {
      listId: string;
      title: string;
      description?: string;
      due?: string;
      position?: "top" | "bottom";
    }) => call<{ id: string; url: string }>("create_card", input),
    updateCard: (input: {
      cardId: string;
      title?: string;
      description?: string;
      due?: string | null;
      dueComplete?: boolean;
      archived?: boolean;
    }) =>
      call<{ id: string; title: string; due: string | null; dueComplete: boolean; archived: boolean; url: string }>(
        "update_card",
        input,
      ),
    moveCard: (cardId: string, listId: string) =>
      call<{ id: string; list: string; url: string }>("move_card", { cardId, listId }),
    addComment: (cardId: string, text: string) => call<{ id: string }>("add_comment", { cardId, text }),
    setMember: (cardId: string, userId: string, on: boolean) => call<Ok>("set_card_member", { cardId, userId, on }),
    setCheckItem: (itemId: string, complete: boolean) => call<Ok>("update_check_item", { itemId, complete }),
  };
}

export type Api = ReturnType<typeof api>;

// Shared fetchers for useCachedPromise, so a board or card loaded in one view is cached for the next.
export const fetchBoard = (account: Account, boardId: string) => api(account).board(boardId);
export const fetchCard = (account: Account, cardId: string) => api(account).card(cardId);

/** The signed-in user's id, remembered on the account after the first lookup. */
export async function userId(account: Account) {
  if (account.userId) return account.userId;
  const me = await api(account).whoami();
  await updateAccount(account.id, { userId: me.id, userName: me.name ?? me.username ?? undefined });
  return me.id;
}

/** Signs in to `server` in the browser and remembers who that is. */
export async function connect(server: string, label?: string) {
  const account = await signIn(server, label);
  try {
    const me = await api(account).whoami();
    const named = { ...account, userId: me.id, userName: me.name ?? me.username ?? undefined };
    await updateAccount(account.id, { userId: named.userId, userName: named.userName });
    return named;
  } catch {
    return account;
  }
}

/**
 * For withAccessToken: signs in to Hack Club's Hackban the first time any command runs. It only gates
 * that first sign-in (so it returns an account id, not a token); each request gets its own account's token.
 */
export async function ensureAccount() {
  const [first] = await listAccounts();
  return (first ?? (await connect(DEFAULT_SERVER))).id;
}

/** An item tagged with the account it came from. */
export type From<T> = T & { account: Account };

export type Gathered<T> = {
  /** Every visible account, in order: tag items with their account when there's more than one. */
  accounts: Account[];
  results: { account: Account; data: T }[];
  signedOut: Account[];
  errors: { account: Account; message: string }[];
};

/** Runs `fn` against every account that isn't hidden, all at once. One account failing doesn't sink the rest. */
export async function gather<T>(fn: (api: Api, account: Account) => Promise<T>): Promise<Gathered<T>> {
  const accounts = (await listAccounts()).filter((a) => !a.hidden);
  const settled = await Promise.allSettled(accounts.map((a) => fn(api(a), a)));
  const out: Gathered<T> = { accounts, results: [], signedOut: [], errors: [] };
  settled.forEach((s, i) => {
    const account = accounts[i];
    if (s.status === "fulfilled") out.results.push({ account, data: s.value });
    else if (s.reason instanceof SignedOutError) out.signedOut.push(account);
    else out.errors.push({ account, message: s.reason instanceof Error ? s.reason.message : String(s.reason) });
  });
  return out;
}

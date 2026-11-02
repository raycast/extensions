import { Color, LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";

// Like Hackban for Mac: one account per Hackban server, all of them shown at once.
// The list lives in LocalStorage (Raycast encrypts it); each account's tokens sit under their own key.

export const DEFAULT_SERVER = "https://hackban.hackclub.com";

export type Account = {
  id: string;
  /** Origin of the Hackban server, e.g. https://hackban.hackclub.com */
  server: string;
  label: string;
  color: number;
  hidden?: boolean;
  /** From dynamic client registration; needed to refresh tokens. */
  clientId: string;
  userId?: string;
  userName?: string;
};

export type Tokens = { accessToken: string; refreshToken: string; expiresAt: number };

const ACCOUNTS_KEY = "accounts";
const tokensKey = (id: string) => `tokens:${id}`;

// Raycast's tag colors, in the order Hackban for Mac hands its colors out.
export const ACCOUNT_COLORS: { name: string; color: Color }[] = [
  { name: "Blue", color: Color.Blue },
  { name: "Pink", color: Color.Magenta },
  { name: "Green", color: Color.Green },
  { name: "Orange", color: Color.Orange },
  { name: "Purple", color: Color.Purple },
  { name: "Yellow", color: Color.Yellow },
  { name: "Red", color: Color.Red },
];

export const accountColor = (a: Account) => ACCOUNT_COLORS[a.color % ACCOUNT_COLORS.length].color;
export const host = (a: Account) => new URL(a.server).host;

export async function listAccounts(): Promise<Account[]> {
  const raw = await LocalStorage.getItem<string>(ACCOUNTS_KEY);
  try {
    return raw ? (JSON.parse(raw) as Account[]) : [];
  } catch {
    return [];
  }
}

async function saveAccounts(accounts: Account[]) {
  await LocalStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

/** Adds the account, or replaces the one with the same id, keeping its place in the order. */
export async function saveAccount(account: Account) {
  const accounts = await listAccounts();
  const i = accounts.findIndex((a) => a.id === account.id);
  if (i >= 0) accounts[i] = account;
  else accounts.push(account);
  await saveAccounts(accounts);
}

export async function updateAccount(id: string, patch: Partial<Omit<Account, "id">>) {
  const accounts = await listAccounts();
  await saveAccounts(accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)));
}

export async function moveAccount(id: string, by: -1 | 1) {
  const accounts = await listAccounts();
  const i = accounts.findIndex((a) => a.id === id);
  const j = i + by;
  if (i < 0 || j < 0 || j >= accounts.length) return;
  [accounts[i], accounts[j]] = [accounts[j], accounts[i]];
  await saveAccounts(accounts);
}

export async function removeAccount(id: string) {
  await saveAccounts((await listAccounts()).filter((a) => a.id !== id));
  await clearTokens(id);
}

/** A new account for `server`, in the first color nobody else uses. */
export function newAccount(accounts: Account[], server: string, clientId: string, label?: string): Account {
  const used = new Set(accounts.map((a) => a.color % ACCOUNT_COLORS.length));
  const color = ACCOUNT_COLORS.findIndex((_, i) => !used.has(i));
  return {
    id: randomUUID(),
    server,
    label: label || new URL(server).host,
    color: color >= 0 ? color : accounts.length,
    clientId,
  };
}

export async function readTokens(id: string): Promise<Tokens | undefined> {
  const raw = await LocalStorage.getItem<string>(tokensKey(id));
  try {
    return raw ? (JSON.parse(raw) as Tokens) : undefined;
  } catch {
    return undefined;
  }
}

export async function saveTokens(id: string, tokens: Tokens) {
  await LocalStorage.setItem(tokensKey(id), JSON.stringify(tokens));
}

export async function clearTokens(id: string) {
  await LocalStorage.removeItem(tokensKey(id));
}

/** The origin of a server address someone typed, with https:// assumed. */
export function normalizeServer(raw: string) {
  const s = raw.trim();
  const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Use an http(s) address");
  return url.origin;
}

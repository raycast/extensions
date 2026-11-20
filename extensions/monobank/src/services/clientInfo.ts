import { getPreferenceValues } from "@raycast/api";
import { toClientInfo } from "../api/mappers";
import { getClientInfo, getTokenError, getTokenFingerprint, requireToken } from "../api/monobank";
import { CLIENT_INFO_TTL, STORAGE_KEYS } from "../data/constants";
import { AccountOrJar, AccountType, ClientInfo } from "../types";
import { getDefaultItem } from "../utils/accounts";
import { getPayoutJarTitles } from "../utils/savings";
import { getOwnerChange, purgeOwnerData } from "./owner";
import { readStoredStatement, rescopeStatements } from "./statement";
import { Cached, readJson, writeJson } from "./storage";

type ClientInfoCache = Cached<{ clientInfo: ClientInfo }>;

const emptyClientInfo: ClientInfo = { accounts: [], jars: [] };

/**
 * Requests the client info for `token` and maps it, keeping custom names from the cache, and adds the jars the stored
 * statements show a payout of to the jar title history (see `withPayoutJarTitles`). When the token changed:
 * - for the same person, the stored statements move to the new token, so the history isn't loaded again;
 * - for another person, the previous person's data is removed (see `purgeOwnerData`), and nothing of the cache is
 *   kept.
 *
 * A failed request throws before anything in storage changes, so a mistyped token never removes data. The caller
 * saves the result as the new cache.
 */
export async function refreshClientInfo(token: string | undefined): Promise<ClientInfo> {
  const response = await getClientInfo(token);
  const scope = getTokenFingerprint(token);
  // Read after the request, so a token change another command handled meanwhile isn't handled again.
  const cache = await readJson<ClientInfoCache>(STORAGE_KEYS.clientInfo);
  const change = getOwnerChange(cache, response, scope);

  if (change === "same" && cache?.scope) await rescopeStatements(cache.scope, scope);
  if (change === "other") await purgeOwnerData();

  // A cache from another token of an unknown owner only contributes custom names of accounts this token can see.
  const previous = change === "other" ? emptyClientInfo : (cache?.clientInfo ?? emptyClientInfo);
  const clientInfo = toClientInfo(response, previous, scope);
  // Nothing is stored for another person: their statements were just removed.
  return change === "other" ? clientInfo : withPayoutJarTitles(clientInfo, scope);
}

/**
 * Adds the jars that paid out to a card or FOP account in the stored statements to the jar title history. A jar
 * smashed before the extension first saw it is known only this way. Once added, a title stays after its payout is
 * pruned from the statements.
 */
async function withPayoutJarTitles(clientInfo: ClientInfo, scope: string): Promise<ClientInfo> {
  const known = clientInfo.jarTitleHistory?.titles ?? [];
  const titles = new Set(known);
  for (const account of clientInfo.accounts) {
    const stored = await readStoredStatement(account.id);
    // Statements are read for the token in the preferences, which may have changed since the request.
    if (stored.scope !== scope) continue;
    for (const title of getPayoutJarTitles(stored.items)) titles.add(title);
  }
  if (titles.size === known.length) return clientInfo;
  return { ...clientInfo, jarTitleHistory: { scope, titles: [...titles] } };
}

export interface LoadedClientInfo {
  clientInfo: ClientInfo;
  /** Cards, then FOP accounts, then jars: the order of the account dropdown in "Show Statement". */
  items: AccountOrJar[];
  pinnedIds: string[];
  /** The account "Show Statement" opens by default: the first pinned one, else the first UAH card. */
  defaultItem?: AccountOrJar;
  /** Whether monobank couldn't be reached and the data comes from an older cache. */
  stale: boolean;
  /** Unix milliseconds. */
  updatedAt: number;
}

/**
 * Turns a token problem into an error the AI can explain. Other errors are returned as they are.
 */
export function toUserFacingError(error: unknown) {
  const tokenError = getTokenError(error);
  if (tokenError === "missing") {
    return new Error(
      "The monobank access token is not set. Ask the user to create one at https://api.monobank.ua/ and set it in the monobank extension preferences.",
    );
  }
  if (tokenError === "invalid") {
    return new Error(
      "monobank rejected the access token. Ask the user to check the access token in the monobank extension preferences.",
    );
  }
  return error;
}

/**
 * The user's accounts and jars, from the cache the commands share when it's fresh, else from monobank
 * (which allows one request per 60 seconds). Custom account names are kept. When the request fails for
 * a reason other than the token, the cache for the same token is returned with `stale: true`.
 * Token problems throw `MissingTokenError` / `InvalidTokenError` (see `getTokenError`).
 *
 * `maxAge` (milliseconds) is how old the cache can be to count as fresh. Commands that run in the background
 * pass a longer one, so they don't request the accounts on every run.
 */
export async function fetchClientInfo({
  maxAge = CLIENT_INFO_TTL,
}: { maxAge?: number } = {}): Promise<LoadedClientInfo> {
  const { token } = getPreferenceValues<Preferences>();
  requireToken(token);

  const scope = getTokenFingerprint(token);
  const cache = await readJson<ClientInfoCache>(STORAGE_KEYS.clientInfo);
  const sameScopeCache = cache?.scope === scope ? cache : undefined;

  // Pins are read last, since a token of another person removes them (see `refreshClientInfo`).
  const result = async (clientInfo: ClientInfo, updatedAt: number, stale: boolean): Promise<LoadedClientInfo> => {
    const pinnedIds = (await readJson<string[]>(STORAGE_KEYS.pinnedAccounts)) ?? [];
    const items = getItems(clientInfo);
    return { clientInfo, items, pinnedIds, defaultItem: getDefaultItem(items, pinnedIds), stale, updatedAt };
  };

  if (sameScopeCache && Date.now() - sameScopeCache.lastUpdated <= maxAge) {
    return result(sameScopeCache.clientInfo, sameScopeCache.lastUpdated, false);
  }

  try {
    const clientInfo = await refreshClientInfo(token);
    const lastUpdated = Date.now();
    await writeJson(STORAGE_KEYS.clientInfo, { clientInfo, lastUpdated, scope } satisfies ClientInfoCache);
    return await result(clientInfo, lastUpdated, false);
  } catch (error) {
    if (getTokenError(error) || !sameScopeCache) throw error;

    console.error(error);
    return result(sameScopeCache.clientInfo, sameScopeCache.lastUpdated, true);
  }
}

/** Like `fetchClientInfo`, but token problems become errors the AI can explain. */
export async function loadClientInfo(): Promise<LoadedClientInfo> {
  try {
    return await fetchClientInfo();
  } catch (error) {
    throw toUserFacingError(error);
  }
}

/**
 * For AI tools: the account or jar with `accountId`, else the default one. Throws an error the AI can act on when
 * there's none.
 */
export function resolveToolAccount(loaded: LoadedClientInfo, accountId: string | undefined) {
  const account = accountId ? loaded.items.find((item) => item.id === accountId) : loaded.defaultItem;
  if (!account) {
    throw new Error(
      accountId
        ? `No account or jar has the id "${accountId}". Call get-accounts to get the ids.`
        : "The user has no accounts",
    );
  }
  return account;
}

function getItems(clientInfo: ClientInfo): AccountOrJar[] {
  const cards = clientInfo.accounts.filter((account) => account.type !== AccountType.FOP);
  const fops = clientInfo.accounts.filter((account) => account.type === AccountType.FOP);
  return [...cards, ...fops, ...clientInfo.jars];
}

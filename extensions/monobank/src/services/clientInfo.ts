import { getPreferenceValues } from "@raycast/api";
import { toClientInfo } from "../api/mappers";
import { getClientInfo, getTokenError, getTokenFingerprint, requireToken } from "../api/monobank";
import { CLIENT_INFO_TTL, STORAGE_KEYS } from "../data/constants";
import { AccountOrJar, AccountType, ClientInfo } from "../types";
import { getDefaultItem } from "../utils/accounts";
import { Cached, readJson, writeJson } from "./storage";

type ClientInfoCache = Cached<{ clientInfo: ClientInfo }>;

const emptyClientInfo: ClientInfo = { accounts: [], jars: [] };

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
  const [cache, pinnedIds = []] = await Promise.all([
    readJson<ClientInfoCache>(STORAGE_KEYS.clientInfo),
    readJson<string[]>(STORAGE_KEYS.pinnedAccounts),
  ]);
  const sameScopeCache = cache?.scope === scope ? cache : undefined;

  const result = (clientInfo: ClientInfo, updatedAt: number, stale: boolean): LoadedClientInfo => {
    const items = getItems(clientInfo);
    return { clientInfo, items, pinnedIds, defaultItem: getDefaultItem(items, pinnedIds), stale, updatedAt };
  };

  if (sameScopeCache && Date.now() - sameScopeCache.lastUpdated <= maxAge) {
    return result(sameScopeCache.clientInfo, sameScopeCache.lastUpdated, false);
  }

  try {
    // A cache from another token only contributes custom names of accounts this token can see.
    const clientInfo = toClientInfo(await getClientInfo(token), cache?.clientInfo ?? emptyClientInfo, scope);
    const lastUpdated = Date.now();
    await writeJson(STORAGE_KEYS.clientInfo, { clientInfo, lastUpdated, scope } satisfies ClientInfoCache);
    return result(clientInfo, lastUpdated, false);
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

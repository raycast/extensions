import BeeperDesktop from "@beeper/desktop-api";
import { useCachedPromise } from "@raycast/utils";
import { listAccounts } from "../api";

export type AccountServiceInfo = {
  accountID: string;
  serviceLabel: string;
  userDisplayText?: string;
  accountDisplayName: string;
  username?: string;
};

const ACCOUNT_CACHE_TTL_MS = 60_000;

let cache = new Map<string, AccountServiceInfo>();
let cacheExpiresAt = 0;
let inFlight: Promise<Map<string, AccountServiceInfo>> | null = null;

const getUserDisplayText = (user?: BeeperDesktop.User) => {
  if (!user) return undefined;
  return (
    user.email || user.phoneNumber || (user.username ? `@${user.username}` : undefined) || user.fullName || user.id
  );
};

// The API returns a `network` field on accounts (e.g. "WhatsApp", "Discord")
// but the SDK types don't include it yet.
type AccountWithNetwork = BeeperDesktop.Account & { network?: string };

export const buildAccountServiceCache = (accounts: BeeperDesktop.Account[]) => {
  const labelCounts = new Map<string, number>();

  for (const account of accounts as AccountWithNetwork[]) {
    const label = account.network || account.accountID;
    labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
  }

  const entries = (accounts as AccountWithNetwork[]).map((account) => {
    const serviceLabel = account.network || account.accountID;
    const userDisplayText = getUserDisplayText(account.user);
    const hasMultiple = (labelCounts.get(serviceLabel) ?? 0) > 1;

    const info: AccountServiceInfo = {
      accountID: account.accountID,
      serviceLabel,
      userDisplayText,
      accountDisplayName: hasMultiple && userDisplayText ? `${userDisplayText} · ${serviceLabel}` : serviceLabel,
      username: account.user?.username,
    };

    return [account.accountID, info] as const;
  });

  return new Map(entries);
};

export const getAccountServiceInfoList = (accounts: BeeperDesktop.Account[]) =>
  Array.from(buildAccountServiceCache(accounts).values());

export const loadAccountServiceCache = async (options?: { forceRefresh?: boolean }) => {
  const forceRefresh = options?.forceRefresh === true;
  if (!forceRefresh && cache.size > 0 && cacheExpiresAt > Date.now()) {
    return cache;
  }

  if (!forceRefresh && inFlight) {
    return inFlight;
  }

  inFlight = (async () => {
    const accounts = await listAccounts();
    cache = buildAccountServiceCache(accounts);
    cacheExpiresAt = Date.now() + ACCOUNT_CACHE_TTL_MS;
    return cache;
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
};

export const useAccountServiceCache = () =>
  useCachedPromise(async () => Array.from((await loadAccountServiceCache()).values()), [], { keepPreviousData: true });

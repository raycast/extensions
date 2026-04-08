import BeeperDesktop from "@beeper/desktop-api";
import { useCachedPromise } from "@raycast/utils";
import { listAccounts } from "../api";
import { getServiceDisplayName } from "./service-icons";
import { BeeperService, parseService } from "./types";

export type AccountServiceInfo = {
  accountID: string;
  service: BeeperService;
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

export const buildAccountServiceCache = (accounts: BeeperDesktop.Account[]) => {
  const serviceCounts = new Map<BeeperService, number>();

  for (const account of accounts) {
    const service = parseService(account.accountID);
    serviceCounts.set(service, (serviceCounts.get(service) ?? 0) + 1);
  }

  const entries = accounts.map((account) => {
    const service = parseService(account.accountID);
    const serviceLabel = getServiceDisplayName(service);
    const userDisplayText = getUserDisplayText(account.user);
    const hasMultipleAccountsOnSameService = (serviceCounts.get(service) ?? 0) > 1;

    const info: AccountServiceInfo = {
      accountID: account.accountID,
      service,
      serviceLabel,
      userDisplayText,
      accountDisplayName:
        hasMultipleAccountsOnSameService && userDisplayText ? `${userDisplayText} · ${serviceLabel}` : serviceLabel,
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
  useCachedPromise(() => loadAccountServiceCache(), [], { keepPreviousData: true });

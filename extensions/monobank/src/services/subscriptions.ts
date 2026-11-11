import { toTransaction } from "../api/mappers";
import { STORAGE_KEYS } from "../data/constants";
import { Account, Subscription, SubscriptionIdentity, SubscriptionOverride, SubscriptionOverrides } from "../types";
import { isAccount } from "../utils/accounts";
import { getJarTitles } from "../utils/savings";
import {
  applySubscriptionOverrides,
  detectSubscriptions,
  getRejectedPriceChanges,
  getSubscriptionIdentity,
} from "../utils/subscriptions";
import { LoadedClientInfo, loadClientInfo } from "./clientInfo";
import { LockTimeoutError, withStorageLock } from "./lock";
import { StoredStatement, getHistoryCutoff, getPeriodItems, readStoredStatement } from "./statement";
import { readJson, writeJson } from "./storage";

function isOverride(value: unknown): value is SubscriptionOverride {
  if (typeof value !== "object" || value === null) return false;
  const { hidden, name, confirmedPriceChange, rejectedPriceChanges, chargeIds, identity } = value as Record<
    string,
    unknown
  >;
  return (
    (hidden === undefined || hidden === true) &&
    (name === undefined || typeof name === "string") &&
    (confirmedPriceChange === undefined || typeof confirmedPriceChange === "string") &&
    (rejectedPriceChanges === undefined || isStringArray(rejectedPriceChanges)) &&
    (chargeIds === undefined || isStringArray(chargeIds)) &&
    (identity === undefined || isIdentity(identity))
  );
}

function isIdentity(value: unknown): value is SubscriptionIdentity {
  if (typeof value !== "object" || value === null) return false;
  const { accountId, merchant, currency, amount, lastCharge } = value as Record<string, unknown>;
  return (
    typeof accountId === "string" &&
    typeof merchant === "string" &&
    typeof currency === "string" &&
    typeof amount === "number" &&
    typeof lastCharge === "number"
  );
}

/** Saved corrections are changed by the commands, the menu bar and the AI, so each change holds this lock. */
function withOverridesLock<T>(fn: () => Promise<T>, options?: { wait?: number }) {
  return withStorageLock(STORAGE_KEYS.subscriptionOverridesLock, fn, options);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function getChargeIds(subscription: Subscription) {
  return subscription.charges.map((charge) => charge.id);
}

/** Whether two lists have the same ids, in any order. */
function isSameIds(a: string[] | undefined, b: string[]) {
  if (a?.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

/** A change to a subscription's override. */
export interface SubscriptionOverridePatch {
  /** `false` unhides it. */
  hidden?: boolean;
  /** An empty name brings back the merchant's own. */
  name?: string;
  /** Confirms the new price charged by this charge (`Subscription.newPriceChargeId`). */
  confirmPriceChange?: string;
  /** This charge isn't a new price of the subscription: it's left out of it from now on. */
  rejectPriceChange?: string;
}

/** The user's renamed and hidden subscriptions. Invalid entries are left out. */
export async function readSubscriptionOverrides(): Promise<SubscriptionOverrides> {
  const stored = await readJson<unknown>(STORAGE_KEYS.subscriptionOverrides);
  if (typeof stored !== "object" || stored === null || Array.isArray(stored)) return {};
  return Object.fromEntries(Object.entries(stored).filter(([, value]) => isOverride(value)));
}

/** The fields of an override that only find its subscription, rather than correct it. */
const IDENTITY_FIELDS: ReadonlySet<string> = new Set(["chargeIds", "identity"]);

/** Whether `override` corrects anything. Without corrections it's removed. */
function hasCorrections(override: SubscriptionOverride) {
  return Object.keys(override).some((field) => !IDENTITY_FIELDS.has(field));
}

/**
 * Changes the override of `subscription` (under its `key`, see `applySubscriptionOverrides`) and saves its charges
 * and identity, which the override follows from now on. Holds the overrides lock, so a change saved at the same time
 * by another command, the menu bar or the AI isn't lost.
 */
export function updateSubscriptionOverride(subscription: Subscription, patch: SubscriptionOverridePatch) {
  return withOverridesLock(async () => {
    const { key } = subscription;
    const overrides = await readSubscriptionOverrides();
    const next: SubscriptionOverride = { ...overrides[key] };

    if (patch.hidden !== undefined) {
      if (patch.hidden) next.hidden = true;
      else delete next.hidden;
    }
    if (patch.name !== undefined) {
      const name = patch.name.trim();
      if (name) next.name = name;
      else delete next.name;
    }

    if (patch.confirmPriceChange !== undefined) next.confirmedPriceChange = patch.confirmPriceChange;
    if (patch.rejectPriceChange !== undefined) {
      next.rejectedPriceChanges = [...new Set([...(next.rejectedPriceChanges ?? []), patch.rejectPriceChange])];
    }

    if (hasCorrections(next)) {
      overrides[key] = {
        ...next,
        chargeIds: getChargeIds(subscription),
        identity: getSubscriptionIdentity(subscription),
      };
    } else {
      delete overrides[key];
    }
    await writeJson(STORAGE_KEYS.subscriptionOverrides, overrides);
  });
}

/**
 * Saves the current charges and identity of each subscription that has an override (from
 * `applySubscriptionOverrides`), so the override keeps following it as new charges come and old ones drop out of
 * the history. Writes only when some ids changed or an identity is missing. Best effort: when another command holds the overrides lock for
 * long, it skips this time. Returns whether it wrote.
 */
export async function syncSubscriptionOverrideIds(subscriptions: Subscription[]): Promise<boolean> {
  try {
    return await withOverridesLock(
      async () => {
        const overrides = await readSubscriptionOverrides();
        let isChanged = false;

        for (const subscription of subscriptions) {
          const override = overrides[subscription.key];
          const chargeIds = getChargeIds(subscription);
          if (!override || (override.identity && isSameIds(override.chargeIds, chargeIds))) continue;

          overrides[subscription.key] = { ...override, chargeIds, identity: getSubscriptionIdentity(subscription) };
          isChanged = true;
        }

        if (isChanged) await writeJson(STORAGE_KEYS.subscriptionOverrides, overrides);
        return isChanged;
      },
      { wait: 2_000 },
    );
  } catch (error) {
    if (error instanceof LockTimeoutError) return false;
    throw error;
  }
}

/**
 * Undoes "Not a Price Change" for the charge with `chargeId`, under whichever subscription it was saved, so it can
 * continue that subscription at its new price again.
 */
export function restorePriceChange(chargeId: string) {
  return withOverridesLock(async () => {
    const overrides = await readSubscriptionOverrides();
    for (const [key, override] of Object.entries(overrides)) {
      if (!override.rejectedPriceChanges?.includes(chargeId)) continue;

      const rest = override.rejectedPriceChanges.filter((id) => id !== chargeId);
      const next: SubscriptionOverride = { ...override, rejectedPriceChanges: rest };
      if (!rest.length) delete next.rejectedPriceChanges;

      if (hasCorrections(next)) overrides[key] = next;
      else delete overrides[key];
    }
    await writeJson(STORAGE_KEYS.subscriptionOverrides, overrides);
  });
}

/** Unix seconds: where an account's stored transactions run without gaps until its last sync. */
export function getHistoryStart(statement: StoredStatement): number | undefined {
  if (!statement.syncedAt) return undefined;
  return statement.covered[statement.covered.length - 1]?.from;
}

export interface StoredSubscriptions {
  loaded: LoadedClientInfo;
  /** Every subscription, with the user's names. Hidden ones have `hidden: true`. */
  subscriptions: Subscription[];
  /** The cards and FOP accounts checked, with their stored statements. */
  statements: { account: Account; statement: StoredStatement }[];
}

/**
 * The subscriptions in the stored statements of every card and FOP account, for AI tools. Makes no statement
 * requests: "Sync Statements" keeps the history up to date. Token problems become errors the AI can explain.
 */
export async function loadStoredSubscriptions(now = Date.now()): Promise<StoredSubscriptions> {
  return detectStoredSubscriptions(await loadClientInfo(), now);
}

/** The subscriptions in the stored statements of the cards and FOP accounts in `loaded`. Reads storage only. */
export async function detectStoredSubscriptions(
  loaded: LoadedClientInfo,
  now = Date.now(),
): Promise<StoredSubscriptions> {
  const accounts = loaded.items.filter(isAccount);
  const jarTitles = getJarTitles(loaded.clientInfo);
  const period = { from: getHistoryCutoff(now) };

  const [statements, overrides] = await Promise.all([
    Promise.all(accounts.map(async (account) => ({ account, statement: await readStoredStatement(account.id) }))),
    readSubscriptionOverrides(),
  ]);

  const groups = statements.map(({ account, statement }) => ({
    account,
    transactions: getPeriodItems(statement, period).map((item) => toTransaction(item, account.currency, jarTitles)),
  }));
  const subscriptions = applySubscriptionOverrides(
    detectSubscriptions(groups, new Date(now), { rejectedPriceChanges: getRejectedPriceChanges(overrides) }),
    overrides,
  );
  await syncSubscriptionOverrideIds(subscriptions).catch(console.error);

  return { loaded, subscriptions, statements };
}

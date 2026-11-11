import { toTransaction } from "../api/mappers";
import { STORAGE_KEYS } from "../data/constants";
import { Account, Subscription, SubscriptionOverride, SubscriptionOverrides } from "../types";
import { isAccount } from "../utils/accounts";
import { getJarTitles } from "../utils/savings";
import { applySubscriptionOverrides, detectSubscriptions, getRejectedPriceChanges } from "../utils/subscriptions";
import { LoadedClientInfo, loadClientInfo } from "./clientInfo";
import { StoredStatement, getHistoryCutoff, getPeriodItems, readStoredStatement } from "./statement";
import { readJson, writeJson } from "./storage";

function isOverride(value: unknown): value is SubscriptionOverride {
  if (typeof value !== "object" || value === null) return false;
  const { hidden, name, confirmedPriceChange, rejectedPriceChanges } = value as Record<string, unknown>;
  return (
    (hidden === undefined || hidden === true) &&
    (name === undefined || typeof name === "string") &&
    (confirmedPriceChange === undefined || typeof confirmedPriceChange === "string") &&
    (rejectedPriceChanges === undefined ||
      (Array.isArray(rejectedPriceChanges) && rejectedPriceChanges.every((id) => typeof id === "string")))
  );
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

/**
 * Changes the override of the subscription with `key`. Storage is read again first, so a change saved meanwhile by
 * another command isn't lost.
 */
export async function updateSubscriptionOverride(key: string, patch: SubscriptionOverridePatch) {
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

  if (Object.keys(next).length) overrides[key] = next;
  else delete overrides[key];
  await writeJson(STORAGE_KEYS.subscriptionOverrides, overrides);
}

/**
 * Undoes "Not a Price Change" for the charge with `chargeId`, under whichever subscription it was saved, so it can
 * continue that subscription at its new price again.
 */
export async function restorePriceChange(chargeId: string) {
  const overrides = await readSubscriptionOverrides();
  for (const [key, override] of Object.entries(overrides)) {
    if (!override.rejectedPriceChanges?.includes(chargeId)) continue;

    const rest = override.rejectedPriceChanges.filter((id) => id !== chargeId);
    const next: SubscriptionOverride = { ...override, rejectedPriceChanges: rest };
    if (!rest.length) delete next.rejectedPriceChanges;

    if (Object.keys(next).length) overrides[key] = next;
    else delete overrides[key];
  }
  await writeJson(STORAGE_KEYS.subscriptionOverrides, overrides);
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
  const jarTitles = getJarTitles(loaded.clientInfo.jars);
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

  return { loaded, subscriptions, statements };
}

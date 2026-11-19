import { Color, List } from "@raycast/api";
import {
  SUBSCRIPTION_AMOUNT_TOLERANCE,
  SUBSCRIPTION_CADENCE_DAYS,
  SUBSCRIPTION_EXCLUDED_MCC,
  SUBSCRIPTION_GRACE_DAYS,
  SUBSCRIPTION_MAX_INTERLEAVED,
  SUBSCRIPTION_MAX_NOISE,
  SUBSCRIPTION_MAX_PRICE_CHANGE,
  SUBSCRIPTION_MCC,
  SUBSCRIPTION_MIN_GAP_SHARE,
  SUBSCRIPTION_UPCOMING_DAYS,
} from "../data/constants";
import {
  Account,
  Currency,
  CurrencyRate,
  Subscription,
  SubscriptionCadence,
  SubscriptionIdentity,
  SubscriptionOverrides,
  SubscriptionSource,
  Transaction,
} from "../types";
import { formatHryvnias } from "./budgets";
import { formatAmount, formatCurrency, getCurrencyDigits } from "./currency";
import { normalizeCategoryText } from "./mcc";
import { costOf } from "./rates";
import { isSavings } from "./savings";
import { formatDate, startOfDay } from "./statement";

const CADENCES: SubscriptionCadence[] = ["weekly", "monthly", "quarterly"];

/** Charges of one merchant at one price, oldest first, with the price they had before a price change. */
interface Series {
  charges: Transaction[];
  cadence?: SubscriptionCadence;
  previousAmount?: number;
  /**
   * How many charges count toward the confidence. The charges at an older price count only when they were regular
   * themselves, so one earlier bill of another amount doesn't confirm a series of two.
   */
  regularCount: number;
  /** The first charge at the latest price, when it's the only one so far: the price change isn't confirmed yet. */
  newPriceCharge?: Transaction;
  /** Unix seconds: the first charge at the latest price, after a price change. */
  priceChangedAt?: number;
  /** A charge the user said isn't a new price, which this series would otherwise merge with. */
  rejectedPriceCharge?: Transaction;
}

/** Charge ids whose price change the user rejected: they never continue an older series. */
export interface DetectOptions {
  rejectedPriceChanges?: ReadonlySet<string>;
}

/**
 * The merchant part of a description, for grouping charges: lowercase, without punctuation and without words that
 * have digits (order numbers, card digits), e.g. "GOOGLE *YouTube 12345" → "google youtube".
 */
export function normalizeMerchant(description: string) {
  const text = normalizeCategoryText(description);
  const words = text.split(/[^\p{L}\p{N}']+/u).filter((word) => word && !/\d/.test(word));
  return words.length ? words.join(" ") : text;
}

/** The charge's amount in its operation currency, positive. */
function getChargeAmount(transaction: Transaction) {
  return Math.abs(transaction.operationAmount);
}

function toDay(time: number) {
  return startOfDay(new Date(time * 1000));
}

function toUnix(date: Date) {
  return Math.floor(date.getTime() / 1000);
}

/** Whole calendar days from `a` to `b` (both local midnights). Rounded, since a day with a DST change isn't 24 hours. */
function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function getMedian(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function isInBand(days: number, cadence: SubscriptionCadence, factor = 1) {
  const [min, max] = SUBSCRIPTION_CADENCE_DAYS[cadence];
  return days >= min * factor && days <= max * factor;
}

/**
 * Splits a merchant's charges by amount: sorted by amount, each charge within the tolerance of the previous one
 * joins its series. A series has every charge in its amount range, never a subset, so a merchant charged often at
 * one price (e.g. 8 ₴ metro rides) or at many close prices (a café) stays one irregular series.
 */
function splitByAmount(charges: Transaction[]): Transaction[][] {
  const sorted = [...charges].sort((a, b) => getChargeAmount(a) - getChargeAmount(b));
  const groups: Transaction[][] = [];
  let previous = 0;

  for (const charge of sorted) {
    const amount = getChargeAmount(charge);
    const last = groups[groups.length - 1];
    if (last && amount <= previous * (1 + SUBSCRIPTION_AMOUNT_TOLERANCE)) {
      last.push(charge);
    } else {
      groups.push([charge]);
    }
    previous = amount;
  }

  return groups.map((group) => group.sort((a, b) => a.time - b.time));
}

/**
 * Splits charges at one price (oldest first) that have no cadence together into a few interleaved monthly or
 * quarterly series, e.g. two Apple subscriptions at $2.99 charged on the 12th and on the 21st. Each charge joins the series whose last charge
 * is closest to one cadence before it (or two, after a missed charge).
 *
 * The series must explain the charges: 2 to `SUBSCRIPTION_MAX_INTERLEAVED` regular series, plus at most one other
 * charge (e.g. a one-off purchase at the same price). Daily 8 ₴ metro rides would need about 30 monthly series,
 * so they stay one irregular series. `undefined` when no cadence splits them this way.
 */
function splitInterleaved(charges: Transaction[]): Transaction[][] | undefined {
  if (charges.length < 4) return undefined;

  // Not weekly: rides at one fare on fixed weekdays (e.g. the metro on Tuesdays and Fridays) would split that way.
  for (const cadence of ["monthly", "quarterly"] as const) {
    const [min, max] = SUBSCRIPTION_CADENCE_DAYS[cadence];
    const middle = (min + max) / 2;
    const chains: Transaction[][] = [];

    for (const charge of charges) {
      const day = toDay(charge.time);
      const gaps = chains.map((chain) => daysBetween(toDay(chain[chain.length - 1].time), day));
      const closest = (factor: number) =>
        chains
          .map((chain, index) => ({ chain, gap: gaps[index] }))
          .filter(({ gap }) => isInBand(gap, cadence, factor))
          .sort((a, b) => Math.abs(a.gap - middle * factor) - Math.abs(b.gap - middle * factor))[0]?.chain;
      const chain = closest(1) ?? closest(2);
      if (chain) chain.push(charge);
      else chains.push([charge]);
    }

    // Only series that can be subscriptions on their own count (see `toSubscription`).
    const regular = chains.filter(
      (chain) =>
        findCadence(chain) === cadence && (chain.length >= 3 || SUBSCRIPTION_MCC.has(chain[chain.length - 1].mcc)),
    ).length;
    if (regular >= 2 && regular <= SUBSCRIPTION_MAX_INTERLEAVED && chains.length - regular <= 1) return chains;
  }

  return undefined;
}

/** Whether each charge (oldest first) is within the tolerance of the one before it, unlike a utility bill. */
function isSteady(charges: Transaction[]) {
  return charges.slice(1).every((charge, index) => {
    const [low, high] = [getChargeAmount(charges[index]), getChargeAmount(charge)].sort((a, b) => a - b);
    return high <= low * (1 + SUBSCRIPTION_AMOUNT_TOLERANCE);
  });
}

/**
 * The cadence of steady charges (oldest first): the one whose band has the median gap, when at least
 * `SUBSCRIPTION_MIN_GAP_SHARE` of the gaps are in it and the rest are about twice as long (a missed charge).
 */
function findCadence(charges: Transaction[]): SubscriptionCadence | undefined {
  if (charges.length < 2 || !isSteady(charges)) return undefined;

  const gaps = charges.slice(1).map((charge, index) => daysBetween(toDay(charges[index].time), toDay(charge.time)));
  const median = getMedian(gaps);

  return CADENCES.find((cadence) => {
    if (!isInBand(median, cadence)) return false;
    const fits = gaps.filter((gap) => isInBand(gap, cadence)).length;
    const missed = gaps.filter((gap) => isInBand(gap, cadence, 2)).length;
    return fits + missed === gaps.length && fits >= gaps.length * SUBSCRIPTION_MIN_GAP_SHARE;
  });
}

/**
 * Merges series of one merchant across price changes, e.g. Netflix 15.49 → 17.99:
 * - a regular series with an older one that ended about one cadence before it started;
 * - a regular series with a single later charge about one cadence after its last one. One charge doesn't prove the
 *   new price, so the series keeps `newPriceCharge` until the user confirms it or the price is charged again.
 *
 * A charge in `rejected` never starts the newer part. The series it would have merged are marked with
 * `rejectedPriceCharge` instead, so the user can undo it.
 */
function mergePriceChanges(series: Series[], rejected: ReadonlySet<string>): Series[] {
  const list = [...series];
  const isNext = (older: Series, newer: Series, cadence: SubscriptionCadence) =>
    !rejected.has(firstOf(newer).id) && canFollow(older, newer, cadence);
  const byLatest = (a: Series, b: Series) => lastOf(b).time - lastOf(a).time;

  for (;;) {
    let merged: Series | undefined;
    let parts: Series[] = [];

    for (const item of list) {
      if (!item.cadence) continue;

      const older = list.filter((other) => isNext(other, item, item.cadence!)).sort(byLatest)[0];
      if (older) {
        parts = [older, item];
        merged = {
          charges: [...older.charges, ...item.charges],
          cadence: item.cadence,
          // After several price changes, the latest one is shown.
          previousAmount: item.previousAmount ?? getChargeAmount(lastOf(older)),
          priceChangedAt: item.priceChangedAt ?? firstOf(item).time,
          regularCount: item.regularCount + (older.cadence ? older.regularCount : 0),
          newPriceCharge: item.newPriceCharge,
        };
        break;
      }

      // The charge that came on time at another price. Only a single one: irregular charges aren't a price change.
      const newer = list.find((other) => other.charges.length === 1 && isNext(item, other, item.cadence!));
      if (newer) {
        parts = [item, newer];
        merged = {
          charges: [...item.charges, ...newer.charges],
          cadence: item.cadence,
          previousAmount: getChargeAmount(lastOf(item)),
          priceChangedAt: firstOf(newer).time,
          // Until the new price is charged again, the charge doesn't count toward the confidence.
          regularCount: item.regularCount,
          newPriceCharge: firstOf(newer),
        };
        break;
      }
    }

    if (!merged) {
      markRejectedPriceChanges(list, rejected);
      return list;
    }
    for (const part of parts) list.splice(list.indexOf(part), 1);
    list.push(merged);
  }
}

function firstOf(series: Series) {
  return series.charges[0];
}

function lastOf(series: Series) {
  return series.charges[series.charges.length - 1];
}

/** Whether `newer` could continue `older` at another price: it starts about one cadence after `older` ends. */
function canFollow(older: Series, newer: Series, cadence: SubscriptionCadence) {
  return (
    older !== newer &&
    lastOf(older).time < firstOf(newer).time &&
    isInBand(daysBetween(toDay(lastOf(older).time), toDay(firstOf(newer).time)), cadence) &&
    isPriceChange(getChargeAmount(lastOf(older)), getChargeAmount(firstOf(newer)))
  );
}

/** Marks both series of each price change the user rejected, the way `mergePriceChanges` would have merged them. */
function markRejectedPriceChanges(list: Series[], rejected: ReadonlySet<string>) {
  for (const newer of list) {
    const charge = firstOf(newer);
    if (!rejected.has(charge.id)) continue;

    const older = list.find(
      (other) =>
        (newer.cadence && canFollow(other, newer, newer.cadence)) ||
        (other.cadence && newer.charges.length === 1 && canFollow(other, newer, other.cadence)),
    );
    if (older) {
      older.rejectedPriceCharge = charge;
      newer.rejectedPriceCharge = charge;
    }
  }
}

/** Whether a price could have changed from `from` to `to`: by at most `SUBSCRIPTION_MAX_PRICE_CHANGE`. */
function isPriceChange(from: number, to: number) {
  const [low, high] = [from, to].sort((a, b) => a - b);
  // Within the tolerance it's the same price, e.g. two subscriptions of one merchant at $2.99.
  return high > low * (1 + SUBSCRIPTION_AMOUNT_TOLERANCE) && high <= low * (1 + SUBSCRIPTION_MAX_PRICE_CHANGE);
}

/**
 * Whether a series is drowned out by other charges of its merchant: more irregular ones during its span than
 * `SUBSCRIPTION_MAX_NOISE` of its own. A shop visited often can have a few charges a month apart by chance; a
 * subscription's merchant charges little else.
 */
function isNoisy(series: Series, all: Series[]) {
  const regular = new Set(
    all.filter((item) => item.cadence).flatMap((item) => item.charges.map((charge) => charge.id)),
  );
  const from = series.charges[0].time;
  const to = series.charges[series.charges.length - 1].time;
  const noise = all
    .flatMap((item) => item.charges)
    .filter((charge) => charge.time >= from && charge.time <= to && !regular.has(charge.id)).length;
  return noise > series.charges.length * SUBSCRIPTION_MAX_NOISE;
}

/** The date `months` after `date`, on `day` of that month, or its last day when the month is shorter. */
function addMonths(date: Date, months: number, day: number) {
  const year = date.getFullYear();
  const month = date.getMonth() + months;
  const length = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, length));
}

/** The day one cadence after `day`. Monthly and quarterly charges keep `anchorDay` of the month. */
function addCadence(day: Date, cadence: SubscriptionCadence, anchorDay: number) {
  switch (cadence) {
    case "weekly":
      return new Date(day.getFullYear(), day.getMonth(), day.getDate() + 7);
    case "monthly":
      return addMonths(day, 1, anchorDay);
    case "quarterly":
      return addMonths(day, 3, anchorDay);
  }
}

/**
 * The day of the month charges come on: the last charge's, unless it came on the last day of a short month,
 * e.g. 28 Feb for a subscription charged on the 31st.
 */
function getAnchorDay(charges: Transaction[]) {
  const last = toDay(charges[charges.length - 1].time);
  const isMonthEnd = new Date(last.getFullYear(), last.getMonth() + 1, 0).getDate() === last.getDate();
  if (!isMonthEnd) return last.getDate();
  return Math.max(...charges.map((charge) => toDay(charge.time).getDate()));
}

function getMonthlyCost(amount: number, cadence: SubscriptionCadence) {
  switch (cadence) {
    case "weekly":
      return (amount * 52) / 12;
    case "monthly":
      return amount;
    case "quarterly":
      return amount / 3;
  }
}

/** Rounds to cents, so keys don't depend on floating-point noise. */
function formatKeyAmount(amount: number) {
  return (Math.round(amount * 100) / 100).toFixed(2);
}

function toSubscription(account: Account, merchant: string, series: Series, now: Date): Subscription | undefined {
  const { charges, cadence, previousAmount, regularCount } = series;
  if (!cadence) return undefined;

  const last = charges[charges.length - 1];
  // Two charges are only enough from a typical subscription merchant, and never for a weekly one.
  const confidence =
    regularCount >= 3 ? "confirmed" : cadence !== "weekly" && SUBSCRIPTION_MCC.has(last.mcc) ? "likely" : undefined;
  if (!confidence) return undefined;

  const anchorDay = getAnchorDay(charges);
  const next = addCadence(toDay(last.time), cadence, anchorDay);
  const today = startOfDay(now);
  const grace = SUBSCRIPTION_GRACE_DAYS[cadence];

  let status: Subscription["status"];
  if (daysBetween(next, today) <= grace) {
    status = "active";
  } else if (daysBetween(addCadence(next, cadence, anchorDay), today) <= grace) {
    status = "late";
  } else {
    // Missed two charges: cancelled.
    return undefined;
  }

  const amount = getChargeAmount(last);
  return {
    key: [account.id, merchant, last.operationCurrency.code, formatKeyAmount(getChargeAmount(charges[0]))].join("|"),
    name: last.description,
    merchant,
    account,
    cadence,
    confidence,
    status,
    category: last.category,
    amount,
    currency: last.operationCurrency,
    accountAmount: Math.abs(last.amount),
    previousAmount,
    priceChangedAt: series.priceChangedAt,
    newPriceChargeId: series.newPriceCharge?.id,
    rejectedPriceChange: series.rejectedPriceCharge && {
      chargeId: series.rejectedPriceCharge.id,
      amount: getChargeAmount(series.rejectedPriceCharge),
      time: series.rejectedPriceCharge.time,
    },
    lastCharge: last.time,
    nextDate: toUnix(next),
    monthlyCost: getMonthlyCost(amount, cadence),
    charges: [...charges].reverse(),
  };
}

/**
 * Recurring charges in the transactions of each account: weekly, monthly or quarterly charges of one merchant at
 * about the same amount. Pass every stored transaction, not only the ones a search matched. Sorted by the next
 * expected date.
 *
 * Only expenses count, holds included. Savings, transfers, cash and taxes never do. Charges are grouped by merchant
 * (see `normalizeMerchant`), operation currency and account, then split by amount, so two plans of one merchant
 * (e.g. Apple 2.99 and 9.99) are two subscriptions, while a price change keeps one (see `mergePriceChanges`).
 * Subscriptions whose next charge is two cadences late are left out.
 */
export function detectSubscriptions(
  groups: SubscriptionSource[],
  now = new Date(),
  { rejectedPriceChanges = new Set() }: DetectOptions = {},
): Subscription[] {
  const subscriptions: Subscription[] = [];

  for (const { account, transactions } of groups) {
    const byMerchant = new Map<string, { merchant: string; charges: Transaction[] }>();

    for (const transaction of transactions) {
      if (transaction.amount >= 0 || isSavings(transaction) || SUBSCRIPTION_EXCLUDED_MCC.has(transaction.mcc)) continue;

      const merchant = normalizeMerchant(transaction.description);
      const key = `${merchant}|${transaction.operationCurrency.code}`;
      const group = byMerchant.get(key) ?? { merchant, charges: [] };
      group.charges.push(transaction);
      byMerchant.set(key, group);
    }

    for (const { merchant, charges } of byMerchant.values()) {
      const groups = splitByAmount(charges).flatMap((group) =>
        findCadence(group) ? [group] : (splitInterleaved(group) ?? [group]),
      );
      const series = mergePriceChanges(
        groups.map((group): Series => ({ charges: group, cadence: findCadence(group), regularCount: group.length })),
        rejectedPriceChanges,
      );
      const found: Subscription[] = [];
      for (const item of series) {
        if (!item.cadence || isNoisy(item, series)) continue;
        const subscription = toSubscription(account, merchant, item, now);
        if (subscription) found.push(subscription);
      }
      subscriptions.push(...withUniqueKeys(found));
    }
  }

  return subscriptions.sort((a, b) => a.nextDate - b.nextDate || a.name.localeCompare(b.name));
}

/**
 * Makes the keys of one merchant's subscriptions unique: interleaved ones at the same price share a key. The one
 * charged first keeps it; the others get the day they're charged on, e.g. "…|2.99@21". Which one keeps it can change
 * as old charges drop out, so overrides find their subscription by its charges instead (see
 * `bindSubscriptionOverrides`).
 */
function withUniqueKeys(subscriptions: Subscription[]): Subscription[] {
  const firstCharge = (subscription: Subscription) => subscription.charges[subscription.charges.length - 1].time;
  const sorted = [...subscriptions].sort((a, b) => firstCharge(a) - firstCharge(b));
  const used = new Set<string>();

  return sorted.map((subscription) => {
    let key = subscription.key;
    if (used.has(key)) {
      const day = toDay(firstCharge(subscription));
      key = `${subscription.key}@${day.getDate()}`;
      for (let index = 2; used.has(key); index++) key = `${subscription.key}@${index}`;
    }
    used.add(key);
    return key === subscription.key ? subscription : { ...subscription, key };
  });
}

/** The charges whose price change the user rejected, for `detectSubscriptions`. */
export function getRejectedPriceChanges(overrides: SubscriptionOverrides): Set<string> {
  return new Set(Object.values(overrides).flatMap((override) => override.rejectedPriceChanges ?? []));
}

/**
 * Which override belongs to each subscription: the key of its override, or `undefined`. Never by the detected key,
 * which depends on the first charge in the stored history and changes as old charges drop out:
 * 1. An override with `chargeIds` belongs to the subscription that shares the most charges with it.
 * 2. An override none of whose charges are stored anymore (e.g. no command ran while they all dropped out) belongs
 *    to the subscription that continues its `identity`: the same account, merchant and currency, charged only after
 *    the override's last charge, at a price it could have changed to. The closest price wins, then the closest day of
 *    the month, so two subscriptions at the same price (e.g. on the 12th and the 21st) aren't swapped.
 */
export function bindSubscriptionOverrides(
  subscriptions: Subscription[],
  overrides: SubscriptionOverrides,
): (string | undefined)[] {
  const bound: (string | undefined)[] = subscriptions.map(() => undefined);
  const boundKeys = new Set<string>();
  const chargeIds = subscriptions.map((subscription) => new Set(subscription.charges.map((charge) => charge.id)));

  /** Binds the best matches first (lowest `rank`), so two overrides never take the same subscription. */
  function bindBest(matches: { key: string; index: number; rank: number[] }[]) {
    matches.sort((a, b) => compareRanks(a.rank, b.rank));
    for (const { key, index } of matches) {
      if (boundKeys.has(key) || bound[index] !== undefined) continue;
      bound[index] = key;
      boundKeys.add(key);
    }
  }

  bindBest(
    Object.entries(overrides).flatMap(([key, override]) =>
      subscriptions.flatMap((_, index) => {
        const shared = override.chargeIds?.filter((id) => chargeIds[index].has(id)).length ?? 0;
        return shared ? [{ key, index, rank: [-shared] }] : [];
      }),
    ),
  );

  bindBest(
    Object.entries(overrides).flatMap(([key, { identity }]) => {
      if (!identity || boundKeys.has(key)) return [];
      return subscriptions.flatMap((subscription, index) => {
        const rank = bound[index] === undefined ? getContinuationRank(identity, subscription) : undefined;
        return rank ? [{ key, index, rank }] : [];
      });
    }),
  );

  return bound;
}

/**
 * How well `subscription` continues the one saved as `identity` (lower is better), or `undefined` when it can't:
 * another account, merchant or currency, a charge from before the saved last one (then it ran alongside it), or a
 * price too far off.
 */
function getContinuationRank(identity: SubscriptionIdentity, subscription: Subscription): number[] | undefined {
  const firstCharge = subscription.charges[subscription.charges.length - 1];
  if (
    subscription.account.id !== identity.accountId ||
    subscription.merchant !== identity.merchant ||
    subscription.currency.code !== identity.currency ||
    firstCharge.time <= identity.lastCharge
  ) {
    return undefined;
  }

  const amount = getChargeAmount(firstCharge);
  const [low, high] = [amount, identity.amount].sort((a, b) => a - b);
  if (low <= 0 || high > low * (1 + SUBSCRIPTION_MAX_PRICE_CHANGE)) return undefined;

  const days = Math.abs(toDay(firstCharge.time).getDate() - toDay(identity.lastCharge).getDate());
  return [high / low, Math.min(days, 31 - days)];
}

function compareRanks(a: number[], b: number[]) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const difference = (a[i] ?? 0) - (b[i] ?? 0);
    if (difference) return difference;
  }
  return 0;
}

/** What `updateSubscriptionOverride` saves, so the override finds `subscription` again (see `bindSubscriptionOverrides`). */
export function getSubscriptionIdentity(subscription: Subscription): SubscriptionIdentity {
  return {
    accountId: subscription.account.id,
    merchant: subscription.merchant,
    currency: subscription.currency.code,
    amount: subscription.amount,
    lastCharge: subscription.lastCharge,
  };
}

/**
 * Adds the user's names, hidden marks and confirmed prices to `subscriptions` (see `bindSubscriptionOverrides`).
 * A subscription with an override takes its key, so later changes update the same override. One without whose
 * detected key belongs to another subscription's override gets its newest charge added to the key, so a change to
 * it never lands on the other one.
 */
export function applySubscriptionOverrides(
  subscriptions: Subscription[],
  overrides: SubscriptionOverrides,
): Subscription[] {
  const bound = bindSubscriptionOverrides(subscriptions, overrides);

  return subscriptions.map((subscription, index) => {
    const key = bound[index];
    if (key === undefined) {
      if (!overrides[subscription.key]) return subscription;
      return { ...subscription, key: `${subscription.key}#${subscription.charges[0].id}` };
    }

    const override = overrides[key];
    const isConfirmed =
      subscription.newPriceChargeId !== undefined && override.confirmedPriceChange === subscription.newPriceChargeId;
    return {
      ...subscription,
      key,
      customName: override.name,
      hidden: override.hidden,
      seats: override.seats,
      newPriceChargeId: isConfirmed ? undefined : subscription.newPriceChargeId,
    };
  });
}

/** The name the user gave a subscription, else its latest description. */
export function getSubscriptionTitle(subscription: Subscription) {
  return subscription.customName || subscription.name;
}

/** What one person pays of a family subscription: its price split between its seats. `undefined` when it isn't one. */
export function getPerPersonAmount(subscription: Pick<Subscription, "amount" | "seats">) {
  return subscription.seats ? subscription.amount / subscription.seats : undefined;
}

/** E.g. "87.25 ₴ each", or `undefined` when it isn't a family subscription. */
export function formatPerPerson(subscription: Pick<Subscription, "amount" | "currency" | "seats">) {
  const perPerson = getPerPersonAmount(subscription);
  return perPerson === undefined ? undefined : `${formatAmount(perPerson, subscription.currency)} each`;
}

/** What `isUpcoming` and `formatNextDate` need, so slimmer copies of a subscription work too. */
type ScheduledCharge = Pick<Subscription, "status" | "nextDate">;

/** Whether an active subscription is expected within `SUBSCRIPTION_UPCOMING_DAYS`, or a few days late. */
export function isUpcoming(subscription: ScheduledCharge, now = new Date()) {
  if (subscription.status !== "active") return false;
  return daysBetween(startOfDay(now), toDay(subscription.nextDate)) <= SUBSCRIPTION_UPCOMING_DAYS;
}

/** E.g. "Monthly". */
export function formatCadence(cadence: SubscriptionCadence) {
  return cadence[0].toUpperCase() + cadence.slice(1);
}

/** E.g. "today", "tomorrow", "in 3 days", "12 Dec", or "expected 5 Nov" once the date has passed. */
export function formatNextDate(subscription: ScheduledCharge, now = new Date()) {
  const next = toDay(subscription.nextDate);
  const days = daysBetween(startOfDay(now), next);
  const date = formatDate(next, { year: next.getFullYear() !== now.getFullYear() });

  if (days < 0) return `expected ${date}`;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days <= SUBSCRIPTION_UPCOMING_DAYS) return `in ${days} days`;
  return date;
}

/** E.g. "YouTube · Monthly · next charge 13 Dec", or "… · possibly cancelled" when it's late. */
export function formatSubscriptionSummary(subscription: Subscription, now = new Date()) {
  const next = formatNextDate(subscription, now);
  const when =
    subscription.status === "late" ? "possibly cancelled" : next.startsWith("expected") ? next : `next charge ${next}`;
  return [getSubscriptionTitle(subscription), formatCadence(subscription.cadence), when].join(" · ");
}

/** What "Subscriptions Menu Bar" shows next to the icon (its "Menu Bar Title" preference). */
export type SubscriptionMenuBarTitle = "nextCharge" | "nextChargeAndPrice" | "monthlyTotal" | "upcomingCount" | "none";

/** Longer names are cut in the menu bar title, which has little room. */
const MENU_BAR_NAME_LENGTH = 20;

/** A subscription as the menu bar title needs it. `amountUah` is its price in UAH, when it's charged in another currency. */
type MenuBarCharge = ScheduledCharge &
  Pick<Subscription, "amount" | "currency"> & { title: string; amountUah?: number };

/** A price for the menu bar title: whole prices without decimals, e.g. "349 ₴", since the title has little room. */
export function formatMenuBarPrice(amount: number, currency: Currency) {
  return Number.isInteger(amount) ? formatCurrency(amount, currency.code, 0) : formatAmount(amount, currency);
}

/** The price of a subscription in UAH, when it's known. */
function getUahAmount(charge: MenuBarCharge) {
  return charge.currency.code === "UAH" ? charge.amount : charge.amountUah;
}

/**
 * What `charges` due the same day cost together: the exact sum in one currency, "≈ 780 ₴" in UAH at monobank's rates
 * when the currencies differ, or the sums per currency, UAH first (e.g. "349 ₴ + $9.99"), when a rate is missing.
 */
function formatMenuBarTotal(charges: MenuBarCharge[]) {
  const byCurrency = new Map<string, { currency: Currency; total: number }>();
  for (const charge of charges) {
    const entry = byCurrency.get(charge.currency.code) ?? { currency: charge.currency, total: 0 };
    entry.total += charge.amount;
    byCurrency.set(charge.currency.code, entry);
  }
  // Sums of decimal prices pick up floating point noise, e.g. 0.1 + 0.2.
  const format = ({ currency, total }: { currency: Currency; total: number }) => {
    const factor = 10 ** getCurrencyDigits(currency);
    return formatMenuBarPrice(Math.round(total * factor) / factor, currency);
  };

  const totals = [...byCurrency.values()];
  if (totals.length === 1) return format(totals[0]);

  const uahAmounts = charges.map(getUahAmount);
  if (uahAmounts.every((amount) => amount !== undefined)) {
    return `≈ ${formatHryvnias(uahAmounts.reduce((sum, amount) => sum + amount, 0))}`;
  }
  return totals
    .sort((a, b) => Number(b.currency.code === "UAH") - Number(a.currency.code === "UAH"))
    .map(format)
    .join(" + ");
}

/**
 * The menu bar title, or undefined to show only the icon: the active subscription charged next, e.g.
 * "Netflix · tomorrow" or "Netflix · 349 ₴ · tomorrow" with its price, the monthly total in UAH, or how many are
 * upcoming. When several are due that day, the most expensive one is named with how many others there are, and the
 * price is their total, e.g. "YouTube (+1) · 780 ₴ · tomorrow" (see `formatMenuBarTotal`).
 */
export function getSubscriptionMenuBarTitle(
  subscriptions: MenuBarCharge[],
  monthlyTotal: number | undefined,
  mode: SubscriptionMenuBarTitle,
  now = new Date(),
) {
  const active = subscriptions.filter((subscription) => subscription.status === "active");

  if (mode === "nextCharge" || mode === "nextChargeAndPrice") {
    if (!active.length) return undefined;
    const nextDate = Math.min(...active.map((subscription) => subscription.nextDate));
    // Compared in UAH when the rates are known, so a $20 charge comes before a 349 ₴ one.
    const due = active
      .filter((subscription) => subscription.nextDate === nextDate)
      .sort((a, b) => (getUahAmount(b) ?? b.amount) - (getUahAmount(a) ?? a.amount));
    const [next] = due;
    // Only the name is cut, so the count of the others always shows.
    const name =
      next.title.length > MENU_BAR_NAME_LENGTH
        ? `${next.title.slice(0, MENU_BAR_NAME_LENGTH - 1).trimEnd()}…`
        : next.title;
    const others = due.length > 1 ? ` (+${due.length - 1})` : "";
    const price = mode === "nextChargeAndPrice" && formatMenuBarTotal(due);
    return [name + others, price, formatNextDate(next, now)].filter(Boolean).join(" · ");
  }
  if (mode === "monthlyTotal") {
    return monthlyTotal !== undefined && active.length ? `≈ ${formatHryvnias(monthlyTotal)}/mo` : undefined;
  }
  if (mode === "upcomingCount") {
    const count = active.filter((subscription) => isUpcoming(subscription, now)).length;
    return count ? String(count) : undefined;
  }
  return undefined;
}

/** The "Subscription" tag on a statement charge of `subscription`. */
export function getSubscriptionTag(subscription: Subscription, now = new Date()): List.Item.Accessory {
  return {
    tag: { value: "Subscription", color: Color.SecondaryText },
    tooltip: formatSubscriptionSummary(subscription, now),
  };
}

/**
 * What `subscriptions` cost per month in UAH, at monobank's rates (see `costOf`). `undefined` when a currency has no
 * rate, e.g. before the rates are loaded.
 */
export function getMonthlyTotal(subscriptions: Subscription[], rates: CurrencyRate[]) {
  let total = 0;
  for (const subscription of subscriptions) {
    const cost = costOf(rates, subscription.monthlyCost, subscription.currency.code, "UAH");
    if (!cost) return undefined;
    total += cost.result;
  }
  return total;
}

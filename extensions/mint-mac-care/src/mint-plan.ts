// Raycast's plan wall (2026-11-10, Yukun: "关键是说出我们已有的功劳，还有等待的
// opportunity"): when Mint's free week holds back something started here, a
// small copy of Mint's plan page. Left, what Mint has done on this Mac and what
// that is worth over 3 years, with the page's chart; right, what is ready now,
// split Safe to clean / Optimizable, and the two plans. Pure, like
// mint-visuals, so node can test it; the view is in plan-wall.tsx.
//
// The figures are Mint's when it can say them (`plan.value`, Mint 1.2.1+,
// `surface.plan.v1`): the page's own functions in Swift, "so far" included.
// On Mint 1.2.0 the left side comes from the same shared value model the app
// and the website price with (space-value-model.ts): what is ready now plus the
// model's monthly default × its months, with no "so far", which only Mint knows.
// Its buttons then open the website's own checkout route, labelled Raycast.

import { formatBytes } from "./mint-cli";
import { GROUPS } from "./mint-visuals";
import { dollars, gapLabel, keptGB, roomChart, storageGBFor, worth } from "./space-value-model";
import type { SpaceValueModel } from "./space-value-model";

export const PLAN_CAPABILITY = "surface.plan.v1";
/** The prices the plan page reads, on a Mint without plan.value (PlanPricing.endpoint). */
export const PRICING_URL = "https://mintstorage.app/api/pricing.json";
/** The website's checkout handoff the Pricing page uses (website/functions/r/purchase.js): no deploy needed. */
export const PURCHASE_URL = "https://mintstorage.app/r/purchase/";
/** Where a press goes when the price feed did not say which checkout: the plans, labelled Raycast. */
export const PRICING_PAGE_URL =
  "https://mintstorage.app/pricing/?utm_source=Raycast&utm_medium=referral&utm_campaign=plan_wall";
/**
 * What an order from the wall says about itself: the custom fields /r/purchase passes on
 * (website/functions/_mintPlanCheckout.js). The entry point is the one Mint 1.2.1's own
 * checkout gives the wall (RaycastPlanSurface.entryPoint), so both read as one.
 */
export const ORDER_LABELS = {
  source: "Raycast",
  medium: "referral",
  campaign: "free_tier",
  entry_point: "app_paywall_raycast",
} as const;

/**
 * The plan page's words, character for character, each with where the app
 * says it (test/mint-swift-parity checks every one against the Swift).
 */
export const WORDS = {
  /** WeeklyLimitCopy.localizedHeadline */
  title: "Go unlimited",
  /** WeeklyLimitCopy.localizedReason */
  reason: "Weekly limit reached",
  /** WeeklyLimitCopy.localizedReset */
  reset: "Resets next Monday",
  /** WeeklyLimitCopy.partialSubline: "%@ of free care left" */
  left: (size: string) => `${size} of free care left`,
  /** PlanPageValueColumn.Words.title */
  valueTitle: "Over 3 years on this Mac",
  /** PlanPageValueColumn.Words.estimate */
  estimate: "Estimate",
  /** PlanPageValueColumn.Words.valueLine */
  valueLine: "of space back, at this Mac’s storage cost",
  /** PlanPageValueColumn.Words.sentence (approved word for word, 2026-11-07) */
  sentence: "Mint gives the space back when the work is done.",
  /** PlanPageValueColumn.Words.soFar */
  soFar: "so far",
  /** PlanPageValueColumn.Words.readyNow */
  readyNow: "ready now",
  /** PlanPageValueColumn.Words.aMonth: under "‹N› GB", as the slider's row says it */
  aMonth: "a month",
  /** PlanPageRoomChart */
  withMint: "With Mint",
  neverClean: "Never clean",
  today: "Today",
  threeYears: "3 yrs",
  /** DirectPaywallView.planLine */
  payOnce: "Pay once",
  monthlyThenYours: "Monthly, then yours",
  /** DirectPaywallView.planTerms */
  oneTimeTerms: "Every 1.x update · 30-day refund · plus tax",
  monthlyTerms: (payments: number, total: string) =>
    `${payments} payments, ${total} total · then billing stops · plus tax`,
  /** DirectPaywallView.comparisonRows: what a plan changes, free → plan */
  cleanupOrganize: "Cleanup + Organize",
  perWeek: (size: string) => `${size}/wk`,
  unlimited: "∞",
  autoCare: "Auto Care",
  pauses: "Pauses",
  nonStop: "Non-stop",
  /** DirectTrialCopy (English): oneTimeAction, monthlyAction */
  buyOneTime: "Buy One-Time",
  startRentToOwn: "Start Rent-to-Own",
} as const;

/**
 * Words the wall says that the app does not, written to the plan page's
 * standard (short, concrete, no hype) and shipped; listed for Yukun's
 * fine-tune (2026-11-10: "这个卡片你不用等我的批复").
 */
export const NEW_WORDS = {
  /** View Mac Status's action on a free plan: the plan page's "Go unlimited" in Raycast's title case. */
  goUnlimitedAction: "Go Unlimited",
  /** The toast after a plan's checkout opened in the browser. */
  checkoutOpened: "Checkout opened in your browser",
  /** Under it, Mint 1.2.1+: Mint confirms the payment itself (CheckoutClaims) at its next launch or activation. */
  checkoutNext: "After you pay, open Mint and it unlocks.",
  /** Under it, Mint 1.2.0: the website's checkout, which Mint learns of through the account. */
  checkoutNextSignIn: "After you pay, sign in to Mint with the same email.",
  /** When macOS did not open the checkout. */
  checkoutFailed: "Could not open checkout",
} as const;

/** `plan.value`'s left column: the plan page's own figures (RaycastPlanSurface.answer). */
export type PlanValue = {
  state?: "measured" | "starting";
  soFarBytes: number;
  heldBytes: number;
  held?: "waiting" | "toGetBack";
  monthGB: number;
  months?: number;
  keptGB: number;
  worth: number;
  worthText: string;
  gapLabel: string;
  counts?: Array<{ figure: string; label: string; accent?: boolean }>;
  method?: string;
  chart: { width: number; height: number; top?: number; axis?: number; mint: number[][]; never: number[][] };
};

export type PlanPrices = {
  currency?: string;
  oneTime: string;
  monthly: string;
  paymentsToOwn: number;
  monthlyTotal: string;
};

/** The whole `plan.value` answer. */
export type PlanAnswer = {
  plan?: boolean;
  renewal?: boolean;
  remainingCleanupBytes?: number | null;
  cleanupAllowanceResetsAt?: string;
  prices?: PlanPrices;
  ready?: { safeToCleanBytes?: number; optimizableBytes?: number; measured?: boolean };
  value?: PlanValue | null;
};

/** What `access.check` says (every Mint since 1.0.80). */
export type PlanAccess = {
  allowed?: boolean;
  plan?: boolean;
  remainingCleanupBytes?: number | null;
  customRulesAllowed?: boolean;
  automationAllowed?: boolean;
};

/**
 * Which of Mint's plan refusals a command can meet. `week`: the gate every
 * cleaning action passes first (RaycastSurfaceCommand.perform,
 * DirectAccessPolicy.allowsSurfaceAction), refused exactly when access.check
 * says `allowed` is false. `rules`: a custom cleanup rule, a plan feature
 * (`customRulesAllowed`). `autocare`: turning Auto Care on (`automationAllowed`).
 */
export type PlanGate = "week" | "rules" | "autocare";

/** A chart Mint sent that can be drawn: both lines, every point two finite numbers. */
export function isDrawableChart(chart: PlanValue["chart"] | undefined): chart is PlanValue["chart"] {
  const line = (points: unknown) =>
    Array.isArray(points) &&
    points.length >= 2 &&
    points.every((point) => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite));
  return Boolean(chart && chart.width > 0 && chart.height > 0 && line(chart.mint) && line(chart.never));
}

/** A left column Mint sent that the wall can show: its figure, its words and its chart. */
export function usableValue(value: PlanValue | null | undefined): PlanValue | undefined {
  if (!value || !Number.isFinite(value.worth) || typeof value.worthText !== "string" || !value.worthText)
    return undefined;
  if (typeof value.gapLabel !== "string" || !isDrawableChart(value.chart)) return undefined;
  return value;
}

/**
 * The line under the title, as the page writes it on a wall
 * (WeeklyLimitCopy.subline / partialSubline): spent, or what is left; none on
 * a plan or when Mint did not say.
 */
export function statusLine(access: PlanAccess | PlanAnswer | undefined): string | undefined {
  if (!access || access.plan || access.remainingCleanupBytes === null || access.remainingCleanupBytes === undefined) {
    return undefined;
  }
  const left = Math.max(0, access.remainingCleanupBytes);
  return left > 0 ? `${WORDS.left(formatBytes(left))} · ${WORDS.reset}` : `${WORDS.reason} · ${WORDS.reset}`;
}

/**
 * Whether Mint refused a request for the free plan, read from access.check after
 * the request failed: the same flags Mint's own refusal checks, in no language,
 * so a Mac in Chinese or German reads the same. Any other failure is false and
 * keeps its command's error.
 */
export function refusedForPlan(access: PlanAccess | undefined, gate: PlanGate = "week"): boolean {
  if (!access || access.plan) return false;
  if (gate === "rules") return access.customRulesAllowed === false;
  if (gate === "autocare") return access.automationAllowed === false;
  return access.allowed === false;
}

/**
 * Whether the week held back a run Mint answered with files left as they were,
 * where Mint names no quota count of its own. Mint keeps its gate open while a
 * few kilobytes are left (access.check `allowed` stays true) and refuses each
 * file the week cannot cover at that moment. The week only shrinks during a
 * run, so a file left as it was can be the week's refusal only when it is
 * larger than what is left now; a file the week still covers was left for
 * another reason (in use, changed) and keeps its own message. In no language.
 * `keptBytes`: what each file left as it was asked of the week.
 */
export function heldForWeek(access: PlanAccess | undefined, keptBytes: number[]): boolean {
  if (!access || access.plan) return false;
  if (access.allowed === false) return true;
  const left = access.remainingCleanupBytes;
  return typeof left === "number" && keptBytes.some((bytes) => bytes > left);
}

/**
 * What each file Mint left as it was asked of the week: its failures matched
 * to the request's items by path or name. When Mint does not say which item a
 * failure is (or names one the request did not hold), every item of the
 * request counts, since any of them can be the one.
 */
export function keptSizes<T>(
  failures: unknown[] | undefined,
  items: T[],
  names: (item: T) => string[],
  size: (item: T) => number,
): number[] {
  if (!failures?.length) return [];
  const sizes: number[] = [];
  for (const failure of failures) {
    const named = failure && typeof failure === "object" ? (failure as { path?: unknown; name?: unknown }) : {};
    const key = [named.path, named.name].find((value): value is string => typeof value === "string" && value !== "");
    const match = key
      ? items.find((item) => names(item).some((name) => name === key || name.split("/").pop() === key))
      : undefined;
    if (!match) return items.map(size);
    sizes.push(size(match));
  }
  return sizes;
}

/** Money as the plan page formats it (PlanPricing.formatted): no cents on a whole amount. */
export function money(amount: number, currency = "USD"): string {
  const whole = Number.isInteger(amount);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

/** What ships in the app if the price feed never answers (PlanPricing.Snapshot.bundled). */
export const BUNDLED_PRICES = { currency: "USD", oneTime: 39.99, monthly: 9.99, paymentsToOwn: 4 };

/**
 * The website's pricing feed, read as PlanPricing.decode reads it: anything
 * missing or out of range keeps the bundled value, never "$0".
 */
export function pricesFromFeed(feed: unknown): PlanPrices {
  const root = (feed && typeof feed === "object" ? feed : {}) as Record<string, unknown>;
  const amount = (value: unknown) => (typeof value === "number" && value > 0 && value < 1000 ? value : undefined);
  const currency =
    typeof root.currency === "string" && root.currency.length === 3
      ? root.currency.toUpperCase()
      : BUNDLED_PRICES.currency;
  const oneTime = (root.one_time ?? {}) as Record<string, unknown>;
  const rent = (root.rent_to_own ?? {}) as Record<string, unknown>;
  const payments =
    typeof rent.payments_to_own === "number" && Number.isInteger(rent.payments_to_own) && rent.payments_to_own >= 1
      ? Math.min(24, rent.payments_to_own)
      : BUNDLED_PRICES.paymentsToOwn;
  const one = amount(oneTime.price) ?? BUNDLED_PRICES.oneTime;
  const monthly = amount(rent.monthly) ?? BUNDLED_PRICES.monthly;
  return {
    currency,
    oneTime: money(one, currency),
    monthly: money(monthly, currency),
    paymentsToOwn: payments,
    monthlyTotal: money(Math.round(monthly * payments * 100) / 100, currency),
  };
}

/** One plan tile: its price, the page's line, its terms, and the key that buys it. */
export type PlanTile = {
  mode: "one_time" | "rent_to_own";
  price: string;
  suffix?: string;
  line: string;
  terms: string;
  key: string;
};

/** The page's two tiles, One-Time first and on ↵ as the page starts chosen, Rent to Own on ⌘↵. */
export function planTiles(prices: PlanPrices): PlanTile[] {
  return [
    { mode: "one_time", price: prices.oneTime, line: WORDS.payOnce, terms: WORDS.oneTimeTerms, key: "↵" },
    {
      mode: "rent_to_own",
      price: prices.monthly,
      suffix: `×${prices.paymentsToOwn}`,
      line: WORDS.monthlyThenYours,
      terms: WORDS.monthlyTerms(prices.paymentsToOwn, prices.monthlyTotal),
      key: "⌘ ↵",
    },
  ];
}

/** What is ready now: the page's figure when Mint sent one, else the saved groups'. */
export type ReadyNow = { bytes: number; optimizableBytes: number; safeToCleanBytes: number };

export function readyNow(
  answer: PlanAnswer | undefined,
  groups?: { optimizableBytes?: number; safeToCleanBytes?: number },
  shown: PlanValue | undefined = usableValue(answer?.value),
): ReadyNow {
  const clean = (value: unknown) => (typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0);
  const measured = answer?.ready?.measured;
  const optimizable = clean(measured ? answer?.ready?.optimizableBytes : groups?.optimizableBytes);
  const safe = clean(measured ? answer?.ready?.safeToCleanBytes : groups?.safeToCleanBytes);
  return {
    bytes: shown ? clean(shown.heldBytes) : optimizable + safe,
    optimizableBytes: optimizable,
    safeToCleanBytes: safe,
  };
}

/** The meter's parts, in the Disk page's colours: Optimizable, then Safe to clean. */
export function readyParts(ready: ReadyNow): Array<{ title: string; bytes: number; color: string }> {
  return [
    { title: GROUPS[0].title, bytes: ready.optimizableBytes, color: GROUPS[0].color },
    { title: GROUPS[1].title, bytes: ready.safeToCleanBytes, color: GROUPS[1].color },
  ].filter((part) => part.bytes > 0);
}

/** The left column's footer: "so far" when Mint reclaimed anything (the page's row 5), and the month's figure. */
export function valueFooter(value: PlanValue): Array<{ figure: string; label: string }> {
  const footer: Array<{ figure: string; label: string }> = [];
  const soFar = value.counts?.find((count) => count.label === WORDS.soFar);
  if (soFar) footer.push({ figure: soFar.figure, label: soFar.label });
  footer.push({ figure: `${value.monthGB} GB`, label: WORDS.aMonth });
  return footer;
}

/**
 * The left column on a Mint that cannot say it (1.2.0): the plan page's sum on the shared model,
 * with nothing "so far". What is ready now (or a wall's whole selection, whichever is larger:
 * PlanPageValue.Held.at) counted once, plus the model's monthly default over its months
 * (PlanPageValue.make before Mint has watched a week), priced at this Mac's storage step.
 * Undefined when the disk's size has no Apple step, as the page then shows no column.
 */
export function modelValue(input: {
  model: SpaceValueModel;
  capacityBytes?: number;
  readyBytes: number;
  refusedBytes?: number;
}): PlanValue | undefined {
  const { model } = input;
  const storageGB = input.capacityBytes ? storageGBFor(model, input.capacityBytes) : undefined;
  if (storageGB === undefined) return undefined;
  const held = Math.max(0, input.readyBytes, input.refusedBytes ?? 0);
  const backlogGB = held / 1e9;
  const monthGB = model.monthGB.default;
  const kept = keptGB(model, backlogGB, monthGB);
  const value = worth(model, storageGB, backlogGB, monthGB);
  if (value === undefined) return undefined;
  return {
    state: "starting",
    soFarBytes: 0,
    heldBytes: held,
    held: input.refusedBytes && input.refusedBytes > 0 ? "waiting" : "toGetBack",
    monthGB,
    months: model.months,
    keptGB: kept,
    worth: value,
    worthText: dollars(value),
    gapLabel: gapLabel(kept),
    counts: [],
    chart: roomChart(model, monthGB, backlogGB, kept),
  };
}

/**
 * A plan's checkout on Mint 1.2.0: the website's /r/purchase handoff for the plan the price feed
 * names (its `enabled` variant on pay.dzgapp.com), carrying the wall's labels; the plans page,
 * labelled Raycast, when the feed did not say.
 */
export function purchaseURL(feed: unknown, mode: "one_time" | "rent_to_own"): string {
  const root = (feed && typeof feed === "object" ? feed : {}) as Record<string, { checkout_url?: unknown } | undefined>;
  const raw = (mode === "one_time" ? root.one_time : root.rent_to_own)?.checkout_url;
  let variant: string | null = null;
  try {
    const url = new URL(String(raw));
    if (url.protocol === "https:" && url.hostname === "pay.dzgapp.com") variant = url.searchParams.get("enabled");
  } catch {
    variant = null;
  }
  if (!variant || !/^\d{1,12}$/.test(variant)) return PRICING_PAGE_URL;
  const url = new URL(PURCHASE_URL);
  url.searchParams.set("enabled", variant);
  for (const [key, value] of Object.entries(ORDER_LABELS)) url.searchParams.set(`checkout[custom][${key}]`, value);
  return url.toString();
}

/** The feed's value model, when it sent one (PlanPricing reads the same field). */
export function feedModel(feed: unknown): unknown {
  return feed && typeof feed === "object" ? (feed as { space_value?: unknown }).space_value : undefined;
}

/** The free week's size (LicenseService.freeCleanupByteAllowance), as the page's row writes it. */
export const FREE_WEEK_BYTES = 1_000_000_000;

/**
 * The page's two comparison rows (DirectPaywallView.comparisonRows), at its sizes: shown where
 * ready now would be when nothing is ready, so the column never has a hole.
 */
export function unlockRows(): Array<{ name: string; free: string; plan: string; planSize: number }> {
  return [
    {
      name: WORDS.cleanupOrganize,
      free: WORDS.perWeek(formatBytes(FREE_WEEK_BYTES)),
      plan: WORDS.unlimited,
      planSize: 18,
    },
    { name: WORDS.autoCare, free: WORDS.pauses, plan: WORDS.nonStop, planSize: 13.5 },
  ];
}

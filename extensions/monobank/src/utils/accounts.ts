import { Color, Icon, Image, List } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { Account, AccountOrJar, AccountType, CurrencyRate, Jar } from "../types";
import { SEND_BASE_URL, accountTypeColors, accountTypeTitles } from "../data/constants";
import { formatCurrency } from "./currency";
import { satisfiesTexts } from "./common";

/**
 * Total balance in UAH. Other currencies are converted with the sell rate, or the cross rate for
 * currencies that only have one. Items in a currency without a UAH rate are left out.
 */
export function calculateTotal(items: AccountOrJar[], rates: CurrencyRate[]) {
  return items.reduce((total, item) => {
    if (item.currency.code === "UAH") return total + item.balance;

    const rate = rates.find((rate) => rate.currencyA.code === item.currency.code && rate.currencyB.code === "UAH");
    const value = rate?.rateSell ?? rate?.rateCross;

    return value === undefined ? total : total + item.balance * value;
  }, 0);
}

export function isAccount(item: AccountOrJar): item is Account {
  return (item as Account).iban !== undefined;
}

/**
 * The item to show when nothing else was chosen: the first pinned one, else the first UAH card, else the first item.
 * Doesn't depend on the order monobank returns accounts in, which often starts with a USD or EUR card.
 */
export function getDefaultItem(items: AccountOrJar[], pinnedIds: string[]) {
  const pinned = pinnedIds.map((id) => items.find((item) => item.id === id)).find(Boolean);
  const uahCard = items.find(
    (item) => isAccount(item) && item.type !== AccountType.FOP && item.currency.code === "UAH",
  );
  return pinned ?? uahCard ?? items[0];
}

export function getPanOrIban(account: Account) {
  return account.maskedPan.length ? account.maskedPan[0] : account.iban;
}

export function getItemTitle(item: AccountOrJar) {
  return isAccount(item) ? item.title || getPanOrIban(item) : item.title;
}

/** The title in "Show Statement": a card without a custom name shows its type and last digits, e.g. "Black *0001". */
export function getStatementItemTitle(item: AccountOrJar) {
  if (isAccount(item) && !item.title && item.maskedPan.length) {
    return `${accountTypeTitles[item.type] ?? item.type} *${item.maskedPan[0].slice(-4)}`;
  }
  return getItemTitle(item);
}

export function getSendUrl(sendId: string) {
  return `${SEND_BASE_URL}/${sendId}`;
}

export function hasTopUpPage(account: Account) {
  return !!account.sendId && account.currency.code === "UAH";
}

export function matchesSearch(item: AccountOrJar, searchText: string) {
  if (isAccount(item)) {
    return satisfiesTexts(searchText, item.title, item.currency.code, item.type, getPanOrIban(item));
  }

  return satisfiesTexts(searchText, item.title, item.currency.code);
}

export function getAccountAccessories(account: Account): List.Item.Accessory[] {
  const color = accountTypeColors[account.type];
  const panOrIban = account.type === AccountType.FOP ? account.iban : account.maskedPan[0];

  return account.title
    ? [{ text: panOrIban }, { tag: { value: account.type, color } }]
    : [{ tag: { value: account.type, color } }];
}

/** How much of the goal is collected, from 0 (can be over 1), or undefined for jars without a goal. */
export function getJarProgress(jar: Jar) {
  return jar.goal ? jar.balance / jar.goal : undefined;
}

/** 0: goal not reached yet, 1: goal reached, 2: no goal. */
function getJarGoalGroup(jar: Jar) {
  const progress = getJarProgress(jar);
  if (progress === undefined) return 2;
  return progress >= 1 ? 1 : 0;
}

/** Sorts jars with a goal not reached yet first, then the ones with a reached goal, then jars without a goal. */
export function compareJarsByGoal(a: Jar, b: Jar) {
  return getJarGoalGroup(a) - getJarGoalGroup(b);
}

// Hex colors, not `Color.Green`: the progress ring is an SVG, and the menu bar draws a Raycast color name in it as black.
export const progressColors = {
  green: { light: "#34C759", dark: "#30D158" },
  orange: { light: "#FF9500", dark: "#FF9F0A" },
  red: { light: "#FF3B30", dark: "#FF453A" },
} satisfies Record<string, { light: string; dark: string }>;

const ringBackgrounds = {
  light: { background: "black", backgroundOpacity: 0.15 },
  dark: { background: "white", backgroundOpacity: 0.25 },
};

/** A progress ring for `progress` from 0 to 1 (more is drawn full), with light and dark variants. */
export function getProgressRing(
  progress: number,
  colors: { light: string; dark: string } = progressColors.green,
): Image.ImageLike {
  const value = Math.min(Math.max(progress, 0), 1);
  const ring = (mode: "light" | "dark") => getProgressIcon(value, colors[mode], ringBackgrounds[mode]);
  return { source: { light: ring("light"), dark: ring("dark") } };
}

/** A progress ring for jars with a goal, a check mark once it's reached, and coins for jars without a goal. */
export function getJarIcon(jar: Jar): Image.ImageLike {
  const progress = getJarProgress(jar);
  if (progress === undefined) return Icon.Coins;
  if (progress >= 1) return { source: Icon.CheckCircle, tintColor: Color.Green };

  return getProgressRing(progress);
}

/** The progress as a whole percentage, rounded down so it shows 100% only once the goal is reached. */
export function formatJarPercentage(jar: Jar) {
  const progress = getJarProgress(jar);
  return progress === undefined ? undefined : `${Math.floor(progress * 100)}%`;
}

export function getJarAccessories(jar: Jar): List.Item.Accessory[] {
  const progress = getJarProgress(jar);
  if (progress === undefined) return [];

  const percentage = (progress * 100).toFixed(2);
  return [{ text: formatCurrency(jar.goal, jar.currency.code) }, { icon: getJarIcon(jar), tooltip: `${percentage}%` }];
}

/** What "Jar Progress Menu Bar" shows next to the icon (its "Menu Bar Title" preference). */
export type JarMenuBarTitle = "percentage" | "balance" | "balanceAndGoal" | "none";

/**
 * The jar in the menu bar title: the chosen one, else the first pinned jar, else the first jar with a goal
 * that isn't reached yet, else the first jar with a goal, else the first jar.
 */
export function getMenuBarJar(jars: Jar[], selectedId: string, pinnedIds: string[]) {
  const find = (id: string) => jars.find((jar) => jar.id === id);
  return (
    (selectedId ? find(selectedId) : undefined) ??
    pinnedIds.map(find).find(Boolean) ??
    jars.find((jar) => jar.goal && jar.balance < jar.goal) ??
    jars.find((jar) => jar.goal) ??
    jars[0]
  );
}

/** An amount for the menu bar: without decimals when it's whole, e.g. "50 000 ₴", else with them, e.g. "0.01 ₴". */
function formatShortAmount(amount: number, jar: Jar) {
  return formatCurrency(amount, jar.currency.code, Number.isInteger(amount) ? 0 : 2);
}

/** A jar's balance and goal, e.g. "12 300 ₴ / 50 000 ₴", or just the balance without a goal. */
export function formatJarBalanceAndGoal(jar: Jar) {
  const balance = formatShortAmount(jar.balance, jar);
  return jar.goal ? `${balance} / ${formatShortAmount(jar.goal, jar)}` : balance;
}

/** The menu bar title for `jar`, or undefined to show only the icon. Jars without a goal show their balance. */
export function getJarMenuBarTitle(jar: Jar, mode: JarMenuBarTitle) {
  if (mode === "none") return undefined;
  if (!jar.goal || mode === "balance") return formatShortAmount(jar.balance, jar);
  if (mode === "balanceAndGoal") return formatJarBalanceAndGoal(jar);
  return formatJarPercentage(jar);
}

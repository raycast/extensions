import { Icon } from "@raycast/api";
import { Jar, MccCategory, Transaction } from "../types";
import { normalizeCategoryText } from "./mcc";

/** The MCC monobank gives transfers, including top-ups of the user's own jars. */
const MONEY_TRANSFER_MCC = 4829;

/** Transfers from a card to one of the user's own jars. Not an MCC category: it replaces "Money transfer". */
export const SAVINGS_CATEGORY: MccCategory = {
  group: "SAV",
  groupName: "Savings",
  groupNameUk: "Заощадження",
  name: "Savings",
  nameUk: "Заощадження",
  icon: Icon.Coins,
};

/** The titles of the user's jars, normalized for `isJarTopUp`. Longest first. */
export function getJarTitles(jars: Jar[]): string[] {
  const titles = jars.map((jar) => normalizeCategoryText(jar.title)).filter(Boolean);
  return [...new Set(titles)].sort((a, b) => b.length - a.length);
}

/**
 * Whether a statement item moves money into one of the user's jars. monobank puts the jar's title in the
 * description (e.g. "На банку «На відпустку»"). Only transfers count, so a shop named like a jar doesn't.
 */
export function isJarTopUp(
  item: { amount: number; mcc: number; description: string },
  jarTitles: readonly string[],
): boolean {
  if (item.amount >= 0 || item.mcc !== MONEY_TRANSFER_MCC || !jarTitles.length) return false;

  const description = normalizeCategoryText(item.description);
  return jarTitles.some((title) => description.includes(title));
}

export function isSavings(transaction: Transaction) {
  return transaction.category.group === SAVINGS_CATEGORY.group;
}

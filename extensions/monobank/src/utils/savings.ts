import { Icon } from "@raycast/api";
import { ClientInfo, MccCategory, Transaction } from "../types";
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

/**
 * The titles of the user's jars, normalized for `isJarTopUp`: the current ones and the ones seen before (a jar that
 * was closed or renamed still has top-ups in the stored history).
 */
export function getJarTitles(clientInfo: ClientInfo): string[] {
  const titles = [...clientInfo.jars.map((jar) => jar.title), ...(clientInfo.jarTitleHistory?.titles ?? [])]
    .map(normalizeCategoryText)
    .filter(Boolean);
  return [...new Set(titles)];
}

/**
 * Whether a statement item moves money into one of the user's jars. monobank describes a manual top-up as
 * "Поповнення «Title»" and an automatic one as just "Title". Only outgoing transfers count, and the title must match
 * exactly, so a shop named like a jar, or a transfer that merely mentions a short title, doesn't.
 */
export function isJarTopUp(
  item: { amount: number; mcc: number; description: string },
  jarTitles: readonly string[],
): boolean {
  if (item.amount >= 0 || item.mcc !== MONEY_TRANSFER_MCC || !jarTitles.length) return false;

  const titles = new Set(jarTitles);
  const quoted = [...item.description.matchAll(/«([^»]*)»/g)].map((match) => match[1]);
  return [item.description, ...quoted].some((text) => titles.has(normalizeCategoryText(text)));
}

export function isSavings(transaction: Transaction) {
  return transaction.category.group === SAVINGS_CATEGORY.group;
}

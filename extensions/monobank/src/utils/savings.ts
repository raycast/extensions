import { Icon } from "@raycast/api";
import { ClientInfo, MccCategory, Transaction } from "../types";
import { normalizeCategoryText } from "./mcc";

/** The MCC monobank gives transfers, including top-ups of the user's own jars. */
export const MONEY_TRANSFER_MCC = 4829;

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
 * was closed or renamed still has top-ups in the stored history), or learned from a payout (see `getPayoutJarTitles`).
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
  return findJarTitle(item.description, jarTitles) !== undefined;
}

/**
 * The jar title a description names: the whole of it, or a part in «quotes», when it equals one of `jarTitles`
 * (normalized, from `getJarTitles`). Returned as the description has it.
 */
export function findJarTitle(description: string, jarTitles: readonly string[]): string | undefined {
  const titles = new Set(jarTitles);
  const quoted = [...description.matchAll(/«([^»]*)»/g)].map((match) => match[1]);
  return [description, ...quoted].find((text) => titles.has(normalizeCategoryText(text)));
}

// How a card's statement describes money coming back from one of the user's jars: a part of it, and all of it when
// the jar is smashed. The quotes are always «», as monobank sends them.
const PAYOUT_PATTERN = /^(?:часткове зняття|виплата) банки «([^«»]+)»$/i;

/**
 * The jar title in "Часткове зняття банки «Title»" or "Виплата банки «Title»", as the description has it. Only the
 * user's own jar pays out to their card, so the title is theirs even when the jar is gone from the accounts. The
 * whole description must match; another wording isn't guessed.
 */
export function findPayoutJarTitle(description: string): string | undefined {
  const title = PAYOUT_PATTERN.exec(description.trim().replace(/\s+/g, " "))?.[1].trim();
  return title || undefined;
}

/**
 * The titles of the jars that paid out to a card in `items`. A smashed jar is gone from the accounts, but its payout
 * stays in the statement, so its earlier top-ups can be recognised by the title (see `ClientInfo.jarTitleHistory`).
 */
export function getPayoutJarTitles(items: readonly { amount: number; description: string }[]): string[] {
  const titles = new Set<string>();
  for (const item of items) {
    const title = item.amount > 0 ? findPayoutJarTitle(item.description) : undefined;
    if (title) titles.add(title);
  }
  return [...titles];
}

export function isSavings(transaction: Transaction) {
  return transaction.category.group === SAVINGS_CATEGORY.group;
}

import { getDisplayNames, roundAmount, toLocalIso } from "../services/format";
import { loadRates } from "../services/rates";
import { getHistoryStart, loadStoredSubscriptions } from "../services/subscriptions";
import { getMonthlyTotal, getPerPersonAmount, getSubscriptionTitle } from "../utils/subscriptions";

/** History shorter than this may miss subscriptions, since each one needs at least two charges. */
const SHORT_HISTORY_DAYS = 60;

type Input = {
  /**
   * Whether to include subscriptions that missed their last expected charge (`status: "possiblyCancelled"`).
   * Defaults to true. Pass false only when the user asks about active subscriptions alone.
   */
  includeCancelled?: boolean;
};

/**
 * Get the user's subscriptions and other recurring charges (підписки, регулярні списання, regular payments) on
 * their monobank cards and FOP accounts: weekly, monthly or quarterly charges of one merchant at about the same
 * amount, found in the stored statement history. Each has its `amount` in the charge's `currency` (e.g. USD for
 * ChatGPT on a UAH card), `accountAmount` (the last charge in the account's currency), `lastCharge`, `nextExpected`
 * (local date), `monthlyCost` (in `currency`) and `previousAmount` and `priceChangedOn` after a price change.
 * `newPriceUnconfirmed: true` means the new price was charged only once, so it may be another purchase from the same
 * merchant rather than a price change. A family subscription the user shares has `seats` (how many people share it,
 * including the user) and `perPersonAmount` (`amount` split between them, in `currency`).
 *
 * `status` is "active", or "possiblyCancelled" when the expected charge didn't come. `confidence` is "confirmed"
 * (3 or more charges) or "likely" (2 charges from a typical subscription merchant). `monthlyTotalUah` is the
 * monthly cost of the active ones in UAH at monobank's current rates, at the full price of family subscriptions, since
 * that's what the card pays.
 *
 * Use it for "what subscriptions do I have", "what's charging me next week", "коли наступне списання за…" and
 * "how much do I pay for subscriptions". Makes no statement requests: it reads the history "Sync Statements" stores
 * (`historyFrom` per account), so it answers right away.
 */
export default async function tool(input: Input) {
  const now = Date.now();
  const { loaded, subscriptions, statements } = await loadStoredSubscriptions(now);
  const names = getDisplayNames(loaded.items);
  const includeCancelled = input.includeCancelled ?? true;

  const shown = subscriptions.filter(
    (subscription) => !subscription.hidden && (includeCancelled || subscription.status === "active"),
  );
  const active = subscriptions.filter((subscription) => !subscription.hidden && subscription.status === "active");

  let monthlyTotalUah: number | undefined;
  try {
    const { rates } = await loadRates();
    const total = getMonthlyTotal(active, rates);
    monthlyTotalUah = total !== undefined ? Math.round(total * 100) / 100 : undefined;
  } catch (error) {
    // Rates only add the total; the list still answers most questions.
    console.error(error);
  }

  const accounts = statements.map(({ account, statement }) => {
    const historyFrom = getHistoryStart(statement);
    return {
      name: names.get(account.id),
      historyFrom: historyFrom !== undefined ? toLocalIso(historyFrom).slice(0, 10) : undefined,
      updatedAt: statement.syncedAt ? toLocalIso(Math.floor(statement.syncedAt / 1000)) : undefined,
    };
  });

  const starts = statements.map(({ statement }) => getHistoryStart(statement));
  const synced = starts.filter((start): start is number => start !== undefined);
  const latestStart = synced.length ? Math.max(...synced) : undefined;
  const syncedAt = statements.map(({ statement }) => statement.syncedAt).filter(Boolean);

  let note: string | undefined;
  if (latestStart === undefined) {
    note =
      'No statement history is stored yet. Ask the user to run "Sync Statements" (or open "Show Subscriptions" later): it loads the history in the background, and subscriptions show once a merchant has charged at least twice.';
  } else if (now / 1000 - latestStart < SHORT_HISTORY_DAYS * 86_400) {
    note = `Some accounts have history only since ${toLocalIso(latestStart).slice(0, 10)}, so subscriptions charged less often than that may be missing. "Sync Statements" loads more history in the background.`;
  }

  return {
    subscriptions: shown.map((subscription) => {
      const perPerson = getPerPersonAmount(subscription);
      return {
        name: getSubscriptionTitle(subscription),
        account: names.get(subscription.account.id),
        cadence: subscription.cadence,
        amount: roundAmount(subscription.amount, subscription.currency),
        currency: subscription.currency.code,
        accountAmount: roundAmount(subscription.accountAmount, subscription.account.currency),
        accountCurrency: subscription.account.currency.code,
        previousAmount:
          subscription.previousAmount !== undefined
            ? roundAmount(subscription.previousAmount, subscription.currency)
            : undefined,
        priceChangedOn:
          subscription.priceChangedAt !== undefined ? toLocalIso(subscription.priceChangedAt).slice(0, 10) : undefined,
        newPriceUnconfirmed: subscription.newPriceChargeId ? true : undefined,
        lastCharge: toLocalIso(subscription.lastCharge),
        nextExpected: toLocalIso(subscription.nextDate).slice(0, 10),
        status: subscription.status === "late" ? "possiblyCancelled" : "active",
        confidence: subscription.confidence,
        monthlyCost: roundAmount(subscription.monthlyCost, subscription.currency),
        seats: subscription.seats,
        perPersonAmount: perPerson !== undefined ? roundAmount(perPerson, subscription.currency) : undefined,
        category: subscription.category.name,
      };
    }),
    monthlyTotalUah,
    accounts,
    today: toLocalIso(Math.floor(now / 1000)).slice(0, 10),
    updatedAt: syncedAt.length ? toLocalIso(Math.floor(Math.min(...syncedAt) / 1000)) : undefined,
    note,
  };
}

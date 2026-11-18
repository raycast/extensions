import { accountTypeTitles } from "../data/constants";
import { Account, AccountOrJar, AccountType, Currency } from "../types";
import { getCurrencyDigits } from "../utils/currency";
import { isAccount } from "../utils/accounts";

/** E.g. "Black card" or "FOP account". */
function getAccountTypeName(type: AccountType) {
  const title = accountTypeTitles[type] ?? type;
  return type === AccountType.FOP ? `${title} account` : `${title} card`;
}

/**
 * A readable name for every account and jar: the custom name, else e.g. "Black card UAH". When two
 * fallback names are equal, the last digits of the card or IBAN are added, e.g. "Black card UAH *1234".
 */
export function getDisplayNames(items: AccountOrJar[]) {
  const fallback = (account: Account) => `${getAccountTypeName(account.type)} ${account.currency.code}`;
  const counts = new Map<string, number>();

  for (const item of items) {
    if (isAccount(item) && !item.title) {
      const name = fallback(item);
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }

  return new Map(
    items.map((item) => {
      if (!isAccount(item) || item.title) return [item.id, item.title];

      const name = fallback(item);
      const number = item.maskedPan[0] ?? item.iban;
      return [item.id, (counts.get(name) ?? 0) > 1 ? `${name} *${number.slice(-4)}` : name];
    }),
  );
}

/** Rounds to the currency's minor units, so sums don't show floating-point noise. */
export function roundAmount(amount: number, currency: Currency) {
  const factor = 10 ** getCurrencyDigits(currency);
  return Math.round(amount * factor) / factor;
}

export const pad = (value: number) => String(value).padStart(2, "0");

/** Local time as ISO 8601 without an offset, e.g. "2026-11-09T14:32". */
export function toLocalIso(unixSeconds: number) {
  const date = new Date(unixSeconds * 1000);
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/**
 * Parses an ISO 8601 date ("2026-11-01") or date-time ("2026-11-01T18:00", with or without an offset).
 * Dates and date-times without an offset are local time. A date alone means the start of that day, or
 * its end with `endOfDay`. Returns unix seconds.
 */
export function parseDateTime(text: string, options: { endOfDay?: boolean } = {}) {
  const trimmed = text.trim();
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);

  // `Date` would read a date alone as UTC midnight.
  const date = dateOnly
    ? options.endOfDay
      ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 23, 59, 59)
      : new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(trimmed);

  if (!/^\d{4}-\d{2}-\d{2}/.test(trimmed) || Number.isNaN(date.getTime())) {
    throw new Error(`"${text}" is not an ISO 8601 date (e.g. 2026-11-01) or date-time (e.g. 2026-11-01T18:00)`);
  }

  return Math.floor(date.getTime() / 1000);
}

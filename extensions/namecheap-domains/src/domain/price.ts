import type { DomainCheckResult, PricingTable } from "../namecheap/types";
import { splitDomain } from "./normalize";

export interface DomainPrice {
  amount: number;
  currency: string;
  /** Namecheap's regular price, when it is higher than the current one. */
  regular?: number;
  premium: boolean;
  /** ICANN's per-domain fee. Namecheap quotes it separately, so it is NOT part of `amount`. */
  icannFee: number;
  /**
   * Early Access Program fee. A new TLD can carry one for the first days of general availability, and it
   * dwarfs the registration price, so a quote that ignores it is badly wrong rather than slightly wrong.
   */
  eapFee: number;
}

export function formatPrice(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: amount >= 1000 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/**
 * Registration price for a domain: the premium price Namecheap quotes for premium names,
 * otherwise the standard price of its TLD for the requested term.
 */
export function priceForDomain(
  domain: string,
  pricing: PricingTable,
  years = 1,
  check?: DomainCheckResult,
): DomainPrice | undefined {
  const { tld } = splitDomain(domain, Object.keys(pricing));
  const entry = pricing[tld];
  const currency = entry?.currency ?? "USD";

  if (check?.isPremium && check.premiumRegistrationPrice > 0) {
    return {
      amount: check.premiumRegistrationPrice,
      currency,
      premium: true,
      icannFee: check.icannFee,
      eapFee: check.eapFee,
    };
  }

  const amount = entry?.byYears[years];
  if (amount === undefined) return undefined;
  const regular = entry?.regularByYears[years];
  return {
    amount,
    currency,
    regular: regular !== undefined && regular > amount ? regular : undefined,
    premium: false,
    icannFee: check?.icannFee ?? 0,
    eapFee: check?.eapFee ?? 0,
  };
}

/** True when a fee applies that `amount` does not include. */
export const hasExtraFees = (price: DomainPrice): boolean => price.icannFee > 0 || price.eapFee > 0;

/** What the first term actually costs, fees included. */
export const totalFirstTerm = (price: DomainPrice): number => price.amount + price.icannFee + price.eapFee;

/** Spells out the fees `amount` leaves out, so no quote reads as the final figure when it is not. */
export function feeNote(price: DomainPrice): string {
  const parts: string[] = [];
  if (price.icannFee > 0) parts.push(`${formatPrice(price.icannFee, price.currency)} ICANN fee`);
  if (price.eapFee > 0) parts.push(`${formatPrice(price.eapFee, price.currency)} early access fee`);
  return parts.length ? `plus ${parts.join(" and ")}` : "";
}

/**
 * Human label for a price.
 *
 * Namecheap's price row for a term is the TOTAL for that term, not a yearly rate: .com comes back as 8.88
 * for one year and 17.76 for two. Labelling the two-year figure "per year" would imply double the real cost,
 * so a multi-year term reads as a total.
 */
export function priceLabel(price: DomainPrice, years: number): string {
  const formatted = formatPrice(price.amount, price.currency);
  if (price.premium) return `${formatted} premium`;
  return years === 1 ? `${formatted}/yr` : `${formatted} total for ${years} years`;
}

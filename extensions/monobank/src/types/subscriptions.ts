import { Account } from "./accounts";
import { Currency } from "./common";
import { MccCategory, Transaction } from "./statement";

export type SubscriptionCadence = "weekly" | "monthly" | "quarterly";

/** `confirmed`: charged 3 or more times. `likely`: charged twice by a typical subscription merchant. */
export type SubscriptionConfidence = "confirmed" | "likely";

/** `active`: the next charge is ahead, or only a few days late. `late`: possibly cancelled. */
export type SubscriptionStatus = "active" | "late";

/** A recurring charge found in the stored statements. */
export interface Subscription {
  /**
   * Unique among the subscriptions found. Detected from the account, merchant, currency and the first amount in the
   * stored history, which changes as old charges drop out, so overrides aren't matched by it. A subscription with an
   * override takes the override's key, under which changes are saved (see `applySubscriptionOverrides`).
   */
  key: string;
  /** The description of the latest charge. */
  name: string;
  /** The merchant the charges are grouped by (see `normalizeMerchant`). */
  merchant: string;
  account: Account;
  cadence: SubscriptionCadence;
  confidence: SubscriptionConfidence;
  status: SubscriptionStatus;
  /** The category of the latest charge. */
  category: MccCategory;
  /** The latest charge, positive, in `currency` (the operation currency, e.g. USD for ChatGPT on a UAH card). */
  amount: number;
  currency: Currency;
  /** The latest charge, positive, in the account currency. */
  accountAmount: number;
  /** The amount before the latest price change, in `currency`. */
  previousAmount?: number;
  /** Unix seconds: the first charge at the current price, after a price change. */
  priceChangedAt?: number;
  /**
   * The id of the only charge at the current price, when the price change isn't confirmed: it may be another
   * purchase from the same merchant. Cleared by a second charge at the new price, or when the user confirms it.
   */
  newPriceChargeId?: string;
  /**
   * A charge at another price that would continue (or start) this subscription, but the user said isn't a price
   * change. "It Was a Price Change" undoes that.
   */
  rejectedPriceChange?: { chargeId: string; amount: number; time: number };
  /** Unix seconds. */
  lastCharge: number;
  /** Unix seconds, local midnight of the day the next charge is expected. */
  nextDate: number;
  /** `amount` per month, in `currency`: weekly × 52 / 12, quarterly / 3. */
  monthlyCost: number;
  /** Newest first. */
  charges: Transaction[];
  /** The name the user gave it. */
  customName?: string;
  /** Whether the user marked it as not a subscription. */
  hidden?: boolean;
}

/** The user's corrections to one subscription. */
export interface SubscriptionOverride {
  hidden?: true;
  name?: string;
  /** The id of the charge (`newPriceChargeId`) whose new price the user confirmed. */
  confirmedPriceChange?: string;
  /** Ids of charges the user said aren't a new price of this subscription. */
  rejectedPriceChanges?: string[];
  /**
   * The ids of the subscription's charges when the override was last saved or matched. The override follows these
   * charges, so it stays with its subscription as old charges drop out of the history.
   */
  chargeIds?: string[];
  /**
   * The subscription as it was when the override was last saved or matched, to find it again once none of
   * `chargeIds` are stored anymore (see `bindSubscriptionOverrides`).
   */
  identity?: SubscriptionIdentity;
}

/** What identifies a subscription apart from its charges. */
export interface SubscriptionIdentity {
  accountId: string;
  /** See `Subscription.merchant`. */
  merchant: string;
  /** The operation currency's code, e.g. "USD". */
  currency: string;
  /** The latest charge, positive, in `currency`. */
  amount: number;
  /** Unix seconds of the latest charge. */
  lastCharge: number;
}

/** By `Subscription.key`, which is set once when the override is first saved. */
export type SubscriptionOverrides = Record<string, SubscriptionOverride>;

/** The stored transactions of one account, for `detectSubscriptions`. */
export interface SubscriptionSource {
  account: Account;
  transactions: Transaction[];
}

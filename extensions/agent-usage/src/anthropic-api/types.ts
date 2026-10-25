export interface AnthropicApiCreditGrant {
  /** Grant label from the Console, e.g. a subscription's monthly API credit. */
  name: string;
  /** Credit left on the grant, in major currency units. */
  remaining: number;
  /** ISO timestamp after which the remaining credit is lost. */
  expiresAt: string;
}

export interface AnthropicApiUsage {
  /** Console organization whose prepaid balance is shown. */
  organizationName: string | null;
  /** ISO 4217 code the Console bills in, e.g. "USD". */
  currency: string;
  /** Prepaid API credit left, in major currency units. */
  balance: number;
  /** Month-to-date (UTC) spend in major currency units, or null when the Console did not report it. */
  monthToDateSpend: number | null;
  /** The soonest-expiring grant that still has credit left. */
  nextExpiringGrant: AnthropicApiCreditGrant | null;
}

export interface AnthropicApiError {
  type: "not_configured" | "unauthorized" | "network_error" | "parse_error" | "unknown";
  message: string;
}

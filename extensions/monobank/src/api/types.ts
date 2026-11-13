/**
 * Response contracts of the monobank open API (https://api.monobank.ua/docs/index.html, spec v250818).
 * Only `src/api/` uses these types. The rest of the extension works with the domain types in `src/types/`,
 * which `./mappers` builds from them.
 *
 * Amounts are in the currency's minor units (e.g. kopiyky), and currency codes are ISO 4217 numeric codes.
 */

/** Body of a failed response (e.g. 400, 403, 429). */
export interface ErrorResponse {
  errorDescription?: string;
}

/** `GET /bank/currency`. Each pair has one or more of `rateBuy`, `rateSell` and `rateCross`. */
export interface CurrencyRateResponse {
  /** ISO 4217 numeric code. */
  currencyCodeA: number;
  /** ISO 4217 numeric code. */
  currencyCodeB: number;
  /** Unix time in seconds. */
  date: number;
  rateBuy?: number;
  rateSell?: number;
  rateCross?: number;
}

/** `GET /personal/client-info`. */
export interface ClientInfoResponse {
  clientId: string;
  name: string;
  webHookUrl: string;
  /** Permissions of the token, one letter per permission. */
  permissions: string;
  accounts: AccountResponse[];
  /** Missing for some clients without jars. */
  jars?: JarResponse[];
  /** Clients whose FOP accounts the token's owner manages (accountant access). */
  managedClients?: ManagedClientResponse[];
}

export type AccountTypeResponse = "black" | "white" | "platinum" | "iron" | "fop" | "yellow" | "eAid";

export type CashbackTypeResponse = "None" | "UAH" | "Miles";

export interface AccountResponse {
  id: string;
  /** Identifier for the send.monobank.ua top-up page. */
  sendId: string;
  /** In minor units. */
  balance: number;
  /** In minor units. */
  creditLimit: number;
  type: AccountTypeResponse;
  /** ISO 4217 numeric code. */
  currencyCode: number;
  cashbackType: CashbackTypeResponse;
  /** Masked card numbers. Empty for accounts without a card (e.g. FOP). */
  maskedPan: string[];
  iban: string;
}

export interface JarResponse {
  id: string;
  /** Identifier for the send.monobank.ua top-up page. */
  sendId: string;
  title: string;
  description: string;
  /** ISO 4217 numeric code. */
  currencyCode: number;
  /** In minor units. */
  balance: number;
  /** In minor units. 0 when the jar has no goal. */
  goal: number;
}

export interface ManagedClientResponse {
  clientId: string;
  /** Tax identification number. */
  tin: number;
  name: string;
  accounts: ManagedClientAccountResponse[];
}

export interface ManagedClientAccountResponse {
  id: string;
  /** In minor units. */
  balance: number;
  /** In minor units. */
  creditLimit: number;
  type: "fop";
  /** ISO 4217 numeric code. */
  currencyCode: number;
  iban: string;
}

/**
 * An item of `GET /personal/statement/{account}/{from}/{to}`. Items come newest first.
 *
 * One request returns at most 500 items (per earlier docs; the current spec doesn't say). To get older
 * ones, request again with `to` set to the time of the oldest item received.
 */
export interface StatementItemResponse {
  id: string;
  /** Unix time in seconds. */
  time: number;
  description: string;
  /** Merchant Category Code (ISO 18245). */
  mcc: number;
  /** The MCC before monobank recategorized the transaction. */
  originalMcc: number;
  /**
   * Whether the transaction is an authorization hold that the merchant's bank hasn't settled yet
   * (https://en.wikipedia.org/wiki/Authorization_hold). The money is already blocked and the monobank app
   * shows it as done, but the final amount may still change, e.g. for purchases in another currency.
   */
  hold: boolean;
  /** In minor units of the account currency. Negative for expenses. */
  amount: number;
  /** In minor units of `currencyCode`. */
  operationAmount: number;
  /**
   * ISO 4217 numeric code. The spec labels it the account currency, but it is the currency of
   * the operation, i.e. of `operationAmount`.
   */
  currencyCode: number;
  /** In minor units of the account currency. */
  commissionRate: number;
  /** In minor units of the account currency, or of miles for Miles cashback. */
  cashbackAmount: number;
  /** Balance after the transaction, in minor units of the account currency. */
  balance: number;
  comment?: string;
  /** Receipt number, to look up the receipt on check.gov.ua. */
  receiptId?: string;
  /** Invoice number. Only for FOP accounts. */
  invoiceId?: string;
  /** Counterparty's EDRPOU (company code). Only for FOP accounts. */
  counterEdrpou?: string;
  /** Counterparty's IBAN. Only for FOP accounts. */
  counterIban?: string;
  /** Counterparty's name. */
  counterName?: string;
}

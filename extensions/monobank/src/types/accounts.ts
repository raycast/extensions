import { Currency } from "./common";

export enum AccountType {
  BLACK = "black",
  WHITE = "white",
  PLATINUM = "platinum",
  IRON = "iron",
  FOP = "fop",
  YELLOW = "yellow",
  EAID = "eAid",
  // The two below aren't in monobank's API documentation, but the API returns them.
  /** Дія.Картка: receives state payments, and is spent like a regular card. */
  DIIA = "diia",
  /** The "Національний кешбек" card, which the cashback of the "Зроблено в Україні" programme is paid to. */
  MADE_IN_UKRAINE = "madeInUkraine",
}

export enum CashbackType {
  NONE = "None",
  UAH = "UAH",
  MILES = "Miles",
}

export interface Account {
  id: string;
  title: string;
  sendId: string;
  balance: number;
  creditLimit: number;
  type: AccountType;
  currency: Currency;
  cashbackType?: CashbackType;
  maskedPan: string[];
  iban: string;
}

export interface Jar {
  id: string;
  sendId: string;
  title: string;
  description: string;
  currency: Currency;
  balance: number;
  goal: number;
}

export type AccountOrJar = Account | Jar;

/** The part of the client info the extension uses and caches. */
export interface ClientInfo {
  /** The owner's name as monobank has it, e.g. "Шевченко Тарас" (no patronymic). Missing in caches from older versions. */
  name?: string;
  /**
   * Fingerprint of monobank's `clientId` (see `getClientFingerprint`), so a new token of the same person keeps the
   * stored data. Missing in caches from older versions.
   */
  ownerId?: string;
  accounts: Account[];
  jars: Jar[];
  /**
   * Every jar title seen for the token with fingerprint `scope`, including closed and renamed jars, so their
   * top-ups in the stored history still count as Savings. A jar closed before it was seen is added when a stored
   * statement has its payout ("Виплата банки «Title»"). Missing in caches from older versions.
   */
  jarTitleHistory?: { scope: string; titles: string[] };
}

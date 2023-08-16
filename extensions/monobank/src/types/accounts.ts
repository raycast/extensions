import { Currency } from "./index";

export type AccountType = "black" | "white" | "platinum" | "iron" | "fop" | "yellow" | "eAid";
export type CashbackType = "None" | "UAH" | "Miles";

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

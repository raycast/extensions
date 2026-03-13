import { Currency } from "./index";

export enum AccountType {
  BLACK = "black",
  WHITE = "white",
  PLATINUM = "platinum",
  IRON = "iron",
  FOP = "fop",
  YELLOW = "yellow",
  EAID = "eAid",
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

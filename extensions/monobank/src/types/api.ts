import { AccountType, CashbackType } from "./accounts";

export interface RateResponse {
  currencyCodeA: number;
  currencyCodeB: number;
  date: number;
  rateBuy: number;
  rateCross: number;
  rateSell: number;
}

export interface UserInfoResponse {
  clientId: string;
  name: string;
  webHookUrl: string;
  permissions: string;
  accounts: AccountResponse[];
  jars?: JarResponse[];
}

export interface AccountResponse {
  id: string;
  sendId: string;
  balance: number;
  creditLimit: number;
  type: AccountType;
  currencyCode: number;
  cashbackType: CashbackType;
  maskedPan: string[];
  iban: string;
}

export interface JarResponse {
  id: string;
  sendId: string;
  title: string;
  description: string;
  currencyCode: number;
  balance: number;
  goal: number;
}

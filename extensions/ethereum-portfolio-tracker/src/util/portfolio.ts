import { LocalStorage } from "@raycast/api";
import { Tokens } from "./tokens";

const STORAGE_KEY = "crypto_portfolio";

type AddressEntry = {
  token: Tokens;
  address: string;
  name: string;
  timestamp: number;
};

export type StoredPortfolio = {
  [Tokens.ETH]: Record<AddressEntry["address"], AddressEntry>;
};

const emptyPortfolio: StoredPortfolio = {
  [Tokens.ETH]: {},
};

export const getPortfolio = async (): Promise<StoredPortfolio> => {
  const portfolioJson = await LocalStorage.getItem<string>(STORAGE_KEY);

  return portfolioJson ? (JSON.parse(portfolioJson) as StoredPortfolio) : emptyPortfolio;
};

export const addToPortfolio = async (addressEntry: Omit<AddressEntry, "timestamp">): Promise<void> => {
  const portfolio = await getPortfolio();
  const newEntry: AddressEntry = { ...addressEntry, timestamp: Date.now() };

  portfolio[addressEntry.token][addressEntry.address] = newEntry;

  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio));
};

export const removeFromPortfolio = async (token: Tokens, address: AddressEntry["address"]): Promise<void> => {
  const portfolio = await getPortfolio();
  delete portfolio[token][address];

  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio));
};

export const clearHistory = async (): Promise<void> => {
  await LocalStorage.clear();
};

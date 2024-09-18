import { Balance } from "../api/balances";
import { displayEmptyBalances } from "./preferences";

export const filterPreferedBalances = (balances?: Balance[]): Balance[] => {
  if (!balances) return [];
  if (displayEmptyBalances) return balances;

  return balances.filter((balance) => balance.amount.value > 0);
};

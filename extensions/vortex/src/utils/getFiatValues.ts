import { Transaction } from "../types";

function getFiatValues({
  transactionArray,
  currency,
  rate,
  locale = "en",
}: {
  transactionArray: Transaction[];
  currency: string;
  rate: number;
  locale?: string;
}): Transaction[] {
  return transactionArray.map((tx) => ({
    ...tx,
    fiatAmount: (Number(tx.amount) * rate).toLocaleString(locale, {
      style: "currency",
      currency,
    }),
  }));
}

export default getFiatValues;

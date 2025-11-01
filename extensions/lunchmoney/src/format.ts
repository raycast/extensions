import * as lunchMoney from "./lunchmoney";

export const getFormatedAmount = (transaction: lunchMoney.Transaction): string =>
  Intl.NumberFormat("en-US", { style: "currency", currency: transaction.currency }).format(transaction.to_base);

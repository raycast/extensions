import { WooStore } from "../types/types";

export function formatCurrency(amount: string, store: WooStore): string {
  const { currencySymbol, thousandSeparator, decimalSeparator, numberOfDecimals } = store.formatting;

  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount)) return amount;

  const fixedAmount = numericAmount.toFixed(numberOfDecimals);
  const [integerPart, decimalPart] = fixedAmount.split(".");

  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator);

  return `${currencySymbol} ${formattedInteger}${decimalPart ? decimalSeparator + decimalPart : ""}`;
}

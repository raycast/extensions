const MICROS_MULTIPLIER = 1_000_000;

export const createTwentyCurrencyObject = (amount: string, currencyCode: string) => {
  const normalizedAmount = amount?.trim();
  const normalizedCurrencyCode = currencyCode?.trim();

  if (!normalizedAmount && !normalizedCurrencyCode) {
    return null;
  }

  return {
    amountMicros: Math.round(Number(normalizedAmount || 0) * MICROS_MULTIPLIER),
    currencyCode: normalizedCurrencyCode?.toUpperCase() ?? "",
  };
};

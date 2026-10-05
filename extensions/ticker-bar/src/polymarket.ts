export function polymarketOutcomePrice(
  prices: number[],
  outcomeIndex: number,
  outcomeCount: number,
  fallback?: number,
) {
  const indexed = prices[outcomeIndex];
  if (isProbability(indexed)) return indexed;
  if (!isProbability(fallback)) return undefined;
  if (outcomeIndex === 0) return fallback;
  return outcomeCount === 2 && outcomeIndex === 1
    ? complement(fallback)
    : undefined;
}

export function polymarketOutcomeChange(
  firstOutcomeChange: number | undefined,
  outcomeIndex: number,
  outcomeCount: number,
) {
  if (!Number.isFinite(firstOutcomeChange)) return undefined;
  if (outcomeIndex === 0) return firstOutcomeChange! * 100;
  return outcomeCount === 2 && outcomeIndex === 1
    ? -firstOutcomeChange! * 100
    : undefined;
}

export function polymarketOutcomeBook(
  firstOutcomeBid: number | undefined,
  firstOutcomeAsk: number | undefined,
  outcomeIndex: number,
  outcomeCount: number,
) {
  if (outcomeIndex === 0) {
    return {
      bid: probabilityOrUndefined(firstOutcomeBid),
      ask: probabilityOrUndefined(firstOutcomeAsk),
    };
  }
  if (outcomeCount === 2 && outcomeIndex === 1) {
    return {
      bid: isProbability(firstOutcomeAsk)
        ? complement(firstOutcomeAsk)
        : undefined,
      ask: isProbability(firstOutcomeBid)
        ? complement(firstOutcomeBid)
        : undefined,
    };
  }
  return {};
}

function probabilityOrUndefined(value: number | undefined) {
  return isProbability(value) ? value : undefined;
}

function isProbability(value: number | undefined): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

function complement(value: number) {
  return Math.max(0, Math.min(1, Number((1 - value).toFixed(12))));
}

const formatVolumeWithSuffix = (volume: number): string => {
  if (!volume) return "$0";

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  });

  return formatter.format(volume);
};

const getFirstOutcomePrice = (outcomePrices: string): number => {
  try {
    const [firstPrice] = JSON.parse(outcomePrices);
    if (firstPrice === "0") return 0;
    if (firstPrice === "1") return 1;
    return Number(firstPrice) || 0;
  } catch {
    return 0;
  }
};

const formatPercentage = (price: number): string => {
  return `${(price * 100).toFixed(1)}%`;
};

const getMarketUrl = (tickerSlug: string): string => {
  return `https://polymarket.com/event/${tickerSlug}/`;
};

const trimQuestion = (question: string): string => {
  const trimmed = question
    .replace(/^Will the\s+/i, "")
    .replace(/^Will\s+/i, "")
    .replace(/^[a-z]/, (letter) => letter.toUpperCase());

  const maxLength = 50;
  return trimmed.length <= maxLength ? trimmed : `${trimmed.slice(0, maxLength - 3)}...`;
};

export { trimQuestion, getMarketUrl, getFirstOutcomePrice, formatVolumeWithSuffix, formatPercentage };

export const formatVolumeWithSuffix = (volume: number): string => {
  if (!volume) return "$0";

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  });

  return formatter.format(volume);
};

export const formatPercentage = (price: number): string => {
  return `${(price * 100).toFixed(1)}%`;
};

export const formatAddress = (address: string): string => {
  if (!address) return "";
  // Check if it's an Ethereum address/proxy Wallet format
  if (address.startsWith("0x") && address.length > 10) {
    return `${address.slice(0, 5)}...${address.slice(-5)}`;
  }
  return address;
};

export const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(val);
};

export const trimQuestion = (question: string): string => {
  const trimmed = question
    .replace(/^Will the\s+/i, "")
    .replace(/^Will\s+/i, "")
    .replace(/^[a-z]/, (letter) => letter.toUpperCase());

  const maxLength = 50;
  return trimmed.length <= maxLength ? trimmed : `${trimmed.slice(0, maxLength - 3)}...`;
};

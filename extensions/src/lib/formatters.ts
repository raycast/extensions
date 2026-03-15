export function formatCurrency(amount: number, currency = "usd") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

export function formatSecretKey(secretKey: string) {
  if (secretKey.length < 10) {
    return "Saved securely";
  }

  return `${secretKey.slice(0, 7)}...${secretKey.slice(-4)}`;
}

export function inferDashboardUrl(secretKey: string, explicitUrl?: string) {
  if (explicitUrl) {
    return explicitUrl;
  }

  return secretKey.startsWith("sk_test_")
    ? "https://dashboard.stripe.com/test"
    : "https://dashboard.stripe.com";
}

export function formatRetryLabel(retryAt: string | null) {
  if (!retryAt) {
    return "No more retries scheduled";
  }

  const retryDate = new Date(retryAt);
  const now = new Date();
  const dayInMs = 24 * 60 * 60 * 1000;
  const diffInDays = Math.round(
    (retryDate.getTime() - now.getTime()) / dayInMs,
  );

  if (diffInDays <= 0) {
    return "Retry today";
  }

  if (diffInDays === 1) {
    return "Retry tomorrow";
  }

  return `Retry ${retryDate.toLocaleDateString()}`;
}

export function formatPercentDelta(delta: number | null | undefined) {
  if (delta === null || delta === undefined) {
    return "Live from Stripe";
  }

  const prefix = delta > 0 ? "+" : "";
  return `${prefix}${delta.toFixed(1)}% vs yesterday`;
}

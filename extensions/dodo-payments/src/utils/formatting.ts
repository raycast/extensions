/**
 * Format currency amount from cents to display string
 */
export function formatCurrencyAndAmount(
  cents: number,
  currency: string = "USD",
  minimumFractionDigits?: number,
): string {
  const currencyNumberFormat = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits,
  });
  return currencyNumberFormat.format(cents / 100);
}

/**
 * Format date to readable string
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format date to short format (no time)
 */
export function formatDateShort(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Get status icon for payment status
 */
export function getPaymentStatusIcon(status: string | null | undefined) {
  switch (status?.toLowerCase()) {
    case "succeeded":
      return "✓";
    case "processing":
      return "⏳";
    case "failed":
      return "✗";
    case "cancelled":
      return "⊘";
    case "requires_customer_action":
      return "⚠";
    case "requires_payment_method":
      return "!";
    default:
      return "○";
  }
}

/**
 * Get status icon for subscription status
 */
export function getSubscriptionStatusIcon(status: string | null | undefined) {
  switch (status?.toLowerCase()) {
    case "active":
      return "●";
    case "pending":
      return "○";
    case "on_hold":
      return "⏸";
    case "paused":
      return "⏸";
    case "cancelled":
      return "✗";
    case "failed":
      return "✗";
    case "expired":
      return "⊘";
    default:
      return "○";
  }
}

/**
 * Get readable status text
 */
export function getReadableStatus(status: string | null | undefined): string {
  if (!status) return "Unknown";

  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Get payment method display name
 */
export function getPaymentMethodDisplay(method: string | null | undefined): string {
  if (!method) return "Unknown";

  switch (method.toLowerCase()) {
    case "card":
      return "Credit Card";
    case "bank_transfer":
      return "Bank Transfer";
    case "paypal":
      return "PayPal";
    case "apple_pay":
      return "Apple Pay";
    case "google_pay":
      return "Google Pay";
    default:
      return method.charAt(0).toUpperCase() + method.slice(1);
  }
}

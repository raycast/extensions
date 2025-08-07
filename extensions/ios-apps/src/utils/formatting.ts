/**
 * Format price to display "Free" instead of "0" with proper currency symbol
 */
export function formatPrice(price: string, currency?: string): string {
  if (price === "0") return "Free";

  // Get the appropriate currency symbol based on the currency code
  let symbol = "$"; // Default to USD
  if (currency) {
    switch (currency) {
      case "USD":
        symbol = "$";
        break;
      case "EUR":
        symbol = "€";
        break;
      case "GBP":
        symbol = "£";
        break;
      case "JPY":
        symbol = "¥";
        break;
      case "AUD":
        symbol = "A$";
        break;
      case "CAD":
        symbol = "C$";
        break;
      case "CNY":
        symbol = "¥";
        break;
      case "INR":
        symbol = "₹";
        break;
      case "RUB":
        symbol = "₽";
        break;
      case "KRW":
        symbol = "₩";
        break;
      case "BRL":
        symbol = "R$";
        break;
      case "MXN":
        symbol = "Mex$";
        break;
      // Add more currency codes as needed
      default:
        symbol = currency; // Use the currency code if no symbol is defined
    }
  }

  return `${symbol}${price}`;
}

/**
 * Format file size to human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Format date to relative time string
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return "Today";
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
  return `${Math.floor(diffInDays / 365)} years ago`;
}

/**
 * Sanitize and format app name for display
 */
export function formatAppName(name: string): string {
  return name
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

/**
 * Formats a date string to a more readable format
 */
export function formatDate(dateString: string | undefined): string {
  if (!dateString) return "Unknown";

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid Date";

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

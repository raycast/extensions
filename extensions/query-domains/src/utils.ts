/**
 * Format a date to show relative time if within 30 days, otherwise show full date
 */
export function formatRegistrationDate(dateString: string | null): string {
  if (!dateString) return "N/A";

  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // If within 30 days, show relative time
    if (diffDays >= 0 && diffDays <= 30) {
      if (diffDays === 0) {
        return "Today";
      } else if (diffDays === 1) {
        return "Yesterday";
      } else {
        return `${diffDays} days ago`;
      }
    }

    // Otherwise show year-month format (yyyy-MM)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  } catch {
    return "Invalid date";
  }
}

/**
 * Format expire date to show remaining days if within 90 days
 */
export function formatExpiryDate(dateString: string | null): string {
  if (!dateString) return "N/A";

  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // If expired
    if (diffDays < 0) {
      return "Expired";
    }

    // If expiring within 90 days, show countdown
    if (diffDays <= 90) {
      if (diffDays === 0) {
        return "Expires today";
      } else if (diffDays === 1) {
        return "Expires tomorrow";
      } else {
        return `Expires in ${diffDays} days`;
      }
    }

    // Otherwise show year-month format (yyyy-MM)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  } catch {
    return "Invalid date";
  }
}

/**
 * Format number to K/M/B format (e.g., 1234 -> 1.23K, 1234567 -> 1.23M, 1234567890 -> 1.23B)
 */
export function formatTrafficNumber(num: number): string {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(2).replace(/\.00$/, "") + "B";
  } else if (num >= 1000000) {
    return (num / 1000000).toFixed(2).replace(/\.00$/, "") + "M";
  } else if (num >= 1000) {
    return (num / 1000).toFixed(2).replace(/\.00$/, "") + "K";
  }
  return num.toString();
}

/**
 * Format registration date for detail view - shows full date (yyyy-MM-dd) or relative time
 */
export function formatRegistrationDateDetailed(dateString: string | null): string {
  if (!dateString) return "N/A";

  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // If within 30 days, show relative time
    if (diffDays >= 0 && diffDays <= 30) {
      if (diffDays === 0) {
        return "Today";
      } else if (diffDays === 1) {
        return "Yesterday";
      } else {
        return `${diffDays} days ago`;
      }
    }

    // Otherwise show full date (yyyy-MM-dd)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    return "Invalid date";
  }
}

/**
 * Format expiry date for detail view - shows full date (yyyy-MM-dd) or relative time
 */
export function formatExpiryDateDetailed(dateString: string | null): string {
  if (!dateString) return "N/A";

  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // If expired
    if (diffDays < 0) {
      return "Expired";
    }

    // If expiring within 90 days, show countdown
    if (diffDays <= 90) {
      if (diffDays === 0) {
        return "Expires today";
      } else if (diffDays === 1) {
        return "Expires tomorrow";
      } else {
        return `Expires in ${diffDays} days`;
      }
    }

    // Otherwise show full date (yyyy-MM-dd)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    return "Invalid date";
  }
}

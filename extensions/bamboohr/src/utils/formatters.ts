/**
 * Format time off type for display
 */
export function formatTimeOffType(type: string): string {
  if (!type) return "Time Off";

  // Simplify to just the main categories
  const lowerType = type.toLowerCase();

  // Detect Sick Leave patterns
  if (
    lowerType.includes("sick") ||
    lowerType.includes("medical") ||
    lowerType.includes("doctor") ||
    lowerType.includes("health") ||
    lowerType.includes("ill") ||
    lowerType.includes("wellness")
  ) {
    return "Sick Pay";
  }
  // Detect Vacation patterns
  else if (
    lowerType.includes("vacation") ||
    lowerType.includes("pto") ||
    lowerType.includes("paid time off") ||
    lowerType.includes("personal time off") ||
    lowerType.includes("annual leave") ||
    lowerType.includes("time away") ||
    // If type is just "Time Off" (very generic), we default to Vacation
    lowerType === "time off" ||
    lowerType === "timeoff"
  ) {
    return "Vacation";
  }
  // Detect Holiday patterns
  else if (
    lowerType.includes("holiday") ||
    lowerType.includes("christmas") ||
    lowerType.includes("new year") ||
    lowerType.includes("thanksgiving") ||
    lowerType.includes("memorial day")
  ) {
    return "Holiday";
  }
  // Default handling - keep original with formatting
  else {
    // For any other types, keep the original formatting
    return type
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }
}

/**
 * Format a list of items for display
 */
export function formatList(items: string[]): string {
  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

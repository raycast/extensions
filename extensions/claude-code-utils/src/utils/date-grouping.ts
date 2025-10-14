import { ParsedMessage } from "./claude-message";

/**
 * Date category for message grouping
 */
export type DateCategory = "Today" | "Yesterday" | "This Week" | "This Month" | "This Year" | string; // Year numbers like "2024"

/**
 * Grouped messages by date category
 */
export interface MessageGroup {
  category: DateCategory;
  messages: ParsedMessage[];
  sortKey: number; // For ordering sections
}

/**
 * Determines which date category a message belongs to
 *
 * @param messageDate - The message timestamp
 * @param now - Current date (defaults to new Date(), injectable for testing)
 * @returns Category string ("Today", "Yesterday", "2023", etc.)
 */
function getDateCategory(messageDate: Date, now: Date = new Date()): DateCategory {
  // Normalize dates to midnight for day-level comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const msgDate = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());

  // Today check
  if (msgDate.getTime() === today.getTime()) {
    return "Today";
  }

  // Yesterday check
  if (msgDate.getTime() === yesterday.getTime()) {
    return "Yesterday";
  }

  // This Week check (Monday to Sunday)
  const startOfWeek = new Date(today);
  const dayOfWeek = today.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday is 0, so it's 6 days from Monday
  startOfWeek.setDate(today.getDate() - daysFromMonday); // Go to Monday

  if (msgDate >= startOfWeek && msgDate < yesterday) {
    return "This Week";
  }

  // This Month check
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  if (msgDate >= startOfMonth && msgDate < startOfWeek) {
    return "This Month";
  }

  // This Year check
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  if (msgDate >= startOfYear && msgDate < startOfMonth) {
    return "This Year";
  }

  // Older - group by year
  return messageDate.getFullYear().toString();
}

/**
 * Section display order (newest to oldest)
 */
const SECTION_ORDER: DateCategory[] = ["Today", "Yesterday", "This Week", "This Month", "This Year"];

/**
 * Calculate sort key for section ordering
 * Lower numbers appear first
 *
 * @param category - Date category
 * @returns Sort key (0-4 for standard sections, 1000-year for year sections, descending)
 */
function getSectionSortKey(category: DateCategory): number {
  const index = SECTION_ORDER.indexOf(category);
  if (index !== -1) return index;

  // Year sections: convert to descending order starting from 1000
  // "2024" -> 1000 - 2024 = -1024 + 1000 = maps to larger number for older years
  // We use 10000 - year to get descending order while keeping values > 5
  const year = parseInt(category);
  return isNaN(year) ? 99999 : 10000 - year;
}

/**
 * Groups messages by date category
 *
 * @param messages - Array of messages to group (already sorted by timestamp)
 * @param now - Current date (defaults to new Date(), injectable for testing)
 * @returns Array of message groups, sorted by section order
 */
export function groupMessagesByDate(messages: ParsedMessage[], now: Date = new Date()): MessageGroup[] {
  // Group messages by category
  const groups = new Map<DateCategory, ParsedMessage[]>();

  for (const message of messages) {
    const category = getDateCategory(message.timestamp, now);

    if (!groups.has(category)) {
      groups.set(category, []);
    }

    groups.get(category)!.push(message);
  }

  // Convert to array and sort by section order
  const groupArray: MessageGroup[] = Array.from(groups.entries()).map(([category, messages]) => ({
    category,
    messages,
    sortKey: getSectionSortKey(category),
  }));

  return groupArray.sort((a, b) => a.sortKey - b.sortKey);
}

/**
 * Formats section title with message count
 *
 * @param category - Date category
 * @param count - Number of messages in section
 * @returns Formatted title like "Today (5)" or "2023 (12)"
 */
export function formatSectionTitle(category: DateCategory, count: number): string {
  return `${category} (${count})`;
}

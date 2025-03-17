import { getWhosOut, WhosOutEntry } from "../api/bamboohr";
import { formatDateRange, getToday, getWeekDifference, parseBambooHRDate } from "../utils/dateUtils";
import { formatTimeOffType } from "../utils/formatters";

/**
 * Retrieve all upcoming time off entries for the next few weeks
 */
export default async function getAllUpcomingTimeOff() {
  try {
    // Fetch time off data
    const allEntries = await getWhosOut();

    if (allEntries.length === 0) {
      return "There is no upcoming time off scheduled in the next 30 days.";
    }

    // Group by week
    const today = getToday();
    const entriesByWeek = new Map<number, WhosOutEntry[]>();

    allEntries.forEach((entry) => {
      const startDate = parseBambooHRDate(entry.start);
      const weekDiff = getWeekDifference(today, startDate);

      if (!entriesByWeek.has(weekDiff)) {
        entriesByWeek.set(weekDiff, []);
      }

      entriesByWeek.get(weekDiff)?.push(entry);
    });

    // Sort weeks
    const sortedWeeks = Array.from(entriesByWeek.keys()).sort((a, b) => a - b);

    // Format the response
    let response = `Here's the upcoming time off schedule for the next ${sortedWeeks.length} ${sortedWeeks.length === 1 ? "week" : "weeks"}:\n\n`;

    sortedWeeks.forEach((weekDiff) => {
      const entries = entriesByWeek.get(weekDiff) || [];
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() + weekDiff * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const weekStartStr = weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      const weekEndStr = weekEnd.toLocaleDateString(undefined, { month: "short", day: "numeric" });

      if (weekDiff === 0) {
        response += `This week (${weekStartStr} - ${weekEndStr}):\n`;
      } else if (weekDiff === 1) {
        response += `Next week (${weekStartStr} - ${weekEndStr}):\n`;
      } else {
        response += `Week of ${weekStartStr} - ${weekEndStr}:\n`;
      }

      // Format entries
      formatTimeOffEntries(entries).forEach((line) => {
        response += line + "\n";
      });

      response += "\n";
    });

    return response;
  } catch (error) {
    console.error("Error getting all upcoming time off:", error);
    return "Sorry, I couldn't fetch the upcoming time off schedule due to an error.";
  }
}

/**
 * Format a list of time off entries
 */
function formatTimeOffEntries(entries: WhosOutEntry[]): string[] {
  return entries.map((entry, index) => {
    const dateStart = parseBambooHRDate(entry.start);
    const dateEnd = parseBambooHRDate(entry.end);
    const dateRange = formatDateRange(dateStart, dateEnd);

    return `${index + 1}. ${entry.name} - ${formatTimeOffType(entry.timeOffType || entry.type)} (${dateRange})`;
  });
}

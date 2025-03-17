import { getWhosOut } from "../api/bamboohr";
import { formatDateRange, parseDate, isDateInRange, parseBambooHRDate } from "../utils/dateUtils";
import { formatTimeOffType } from "../utils/formatters";

type Input = {
  /**
   * The date to search for (e.g., 'tomorrow', 'next Monday', 'June 15')
   */
  dateText: string;
};

/**
 * Find out who is out of office on a specific date
 */
export default async function searchTimeOffByDate(input: Input) {
  try {
    const { dateText } = input;

    // Convert user's date text to a date object
    const searchDate = parseDate(dateText);

    if (!searchDate) {
      return `I couldn't understand the date "${dateText}". Please try with a clearer date format like "next Monday", "June 15", or "tomorrow".`;
    }

    // Fetch time off data
    const allEntries = await getWhosOut();

    // Filter entries for people who are out on the search date
    const outOnDate = allEntries.filter((entry) =>
      isDateInRange(searchDate, parseBambooHRDate(entry.start), parseBambooHRDate(entry.end)),
    );

    if (outOnDate.length === 0) {
      const formattedDate = searchDate.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
      return `No one is scheduled to be out of the office on ${formattedDate}.`;
    }

    // Format the response
    const formattedDate = searchDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
    let response = `There ${outOnDate.length === 1 ? "is" : "are"} ${outOnDate.length} ${outOnDate.length === 1 ? "person" : "people"} out of the office on ${formattedDate}:\n\n`;

    outOnDate.forEach((entry, index) => {
      const dateStart = parseBambooHRDate(entry.start);
      const dateEnd = parseBambooHRDate(entry.end);
      const dateRange = formatDateRange(dateStart, dateEnd);

      response += `${index + 1}. ${entry.name} - ${formatTimeOffType(entry.timeOffType || entry.type)} (${dateRange})\n`;
    });

    return response;
  } catch (error) {
    console.error("Error searching time off by date:", error);
    return "Sorry, I couldn't search for time off on that date due to an error.";
  }
}

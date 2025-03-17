// import { getPreferenceValues } from "@raycast/api";
import { getWhosOut } from "../api/bamboohr";
import { formatDateRange, isOutToday, parseBambooHRDate } from "../utils/dateUtils";
import { formatTimeOffType } from "../utils/formatters";

// interface Preferences {
//   subdomain: string;
//   apiKey?: string;
// }

/**
 * Tool to retrieve a list of employees who are out of office today
 */
export default async function Command() {
  try {
    // Fetch who's out data from BambooHR
    const entries = await getWhosOut();

    // Filter for those out today
    const outToday = entries.filter((entry) => isOutToday(entry.start, entry.end));

    // Format the results
    if (outToday.length === 0) {
      return { result: "Good news! No one is out of the office today." };
    }

    // Build the response
    let response = `${outToday.length} ${outToday.length === 1 ? "person is" : "people are"} out today:\n\n`;

    outToday.forEach((entry) => {
      // Use our dedicated BambooHR date parser to parse dates correctly
      const dateStart = parseBambooHRDate(entry.start);
      const dateEnd = parseBambooHRDate(entry.end);

      const formattedDateRange = formatDateRange(dateStart, dateEnd);
      response += `- ${entry.name} (${formatTimeOffType(entry.timeOffType || entry.type)}): ${formattedDateRange}\n`;
    });

    return { result: response };
  } catch (error) {
    console.error("Error getting who's out today:", error);
    return { error: `Failed to get who's out information: ${error instanceof Error ? error.message : String(error)}` };
  }
}

import { getWhosOut, WhosOutEntry } from "../api/bamboohr";
import { formatDateRange, isOutToday, parseBambooHRDate } from "../utils/dateUtils";
import { formatTimeOffType } from "../utils/formatters";

type Input = {
  /**
   * The name (or partial name) of the person to search for
   */
  personName: string;
};

/**
 * Find out when a specific person is out of office
 */
export default async function searchTimeOffByPerson(input: Input) {
  try {
    const { personName } = input;

    // Fetch time off data
    const allEntries = await getWhosOut();

    // Filter entries for the specified person (case insensitive partial match)
    const personEntries = allEntries.filter((entry) => entry.name.toLowerCase().includes(personName.toLowerCase()));

    if (personEntries.length === 0) {
      return `I couldn't find any time off scheduled for anyone named "${personName}".`;
    }

    // Group by person (in case multiple people match the name)
    const personMap = new Map<string, WhosOutEntry[]>();

    personEntries.forEach((entry) => {
      if (!personMap.has(entry.name)) {
        personMap.set(entry.name, []);
      }
      personMap.get(entry.name)?.push(entry);
    });

    // Format the response
    let response = "";

    personMap.forEach((entries, name) => {
      response += `${name} has ${entries.length} upcoming ${entries.length === 1 ? "absence" : "absences"}:\n\n`;

      entries.forEach((entry, index) => {
        const dateStart = parseBambooHRDate(entry.start);
        const dateEnd = parseBambooHRDate(entry.end);
        const dateRange = formatDateRange(dateStart, dateEnd);
        const isCurrentlyOut = isOutToday(entry.start, entry.end);

        response += `${index + 1}. ${formatTimeOffType(entry.timeOffType || entry.type)} (${dateRange})`;
        if (isCurrentlyOut) {
          response += " (Currently out)";
        }
        response += "\n";
      });

      response += "\n";
    });

    return response;
  } catch (error) {
    console.error("Error searching time off by person:", error);
    return "Sorry, I couldn't search for that person's time off due to an error.";
  }
}

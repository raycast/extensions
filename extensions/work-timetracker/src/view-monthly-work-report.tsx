import { List, showToast, Toast, Icon, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState, useMemo } from "react";
import { getStandardHours } from "@utils/date";
import type { Project, TimeEntry } from "@models";
import { readItem, writeItem } from "@utils/storage-helper";

/**
 * Interface extending TimeEntry to include the project name for reporting purposes.
 */
interface ReportEntry extends TimeEntry {
  projectName: string;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth(); // 0-indexed

/**
 * Escapes a string field for CSV format.
 * - Replaces double quotes with two double quotes.
 * - Encloses the field in double quotes if it contains a comma, double quote, or newline.
 * @param field The string or number to escape.
 * @returns The CSV-escaped string.
 */
function escapeCSVField(field: string | number): string {
  const stringField = String(field);
  const escapedField = stringField.replace(/"/g, '""');
  if (
    stringField.includes(",") ||
    stringField.includes('"') ||
    stringField.includes("\n") ||
    stringField.includes("\r")
  ) {
    return `"${escapedField}"`;
  }
  return escapedField;
}

/**
 * Converts report entries and summary data into a CSV formatted string.
 * @param data Array of ReportEntry objects for the selected period.
 * @param period A string describing the period (e.g., "July 2023").
 * @param logged Total hours logged for the period.
 * @param standard Total standard hours for the period.
 * @param balance The difference between logged and standard hours.
 * @returns A string containing the data in CSV format.
 */
function convertToCSV(data: ReportEntry[], period: string, logged: number, standard: number, balance: number): string {
  const header = ["Date", "Project Name", "Hours", "Notes"];
  const rows = data.map((entry) => [
    escapeCSVField(entry.date),
    escapeCSVField(entry.projectName),
    escapeCSVField(typeof entry.hours === "number" ? entry.hours.toFixed(2) : "0.00"),
    escapeCSVField(entry.notes || ""),
  ]);

  const summaryHeader = [`\nSummary for: ${period}`];
  const summaryData = [
    ["Total Logged Hours:", logged.toFixed(2)],
    ["Standard Hours:", standard.toFixed(2)],
    ["Balance:", (balance >= 0 ? "+" : "") + balance.toFixed(2)], // Ensure + for positive balance
  ];

  let csvContent = header.map(escapeCSVField).join(",") + "\n";
  rows.forEach((rowArray) => {
    csvContent += rowArray.join(",") + "\n";
  });

  csvContent += summaryHeader.join(",") + "\n"; // No need to escape this manually constructed header
  summaryData.forEach((rowArray) => {
    csvContent += rowArray.map(escapeCSVField).join(",") + "\n";
  });

  return csvContent;
}

/**
 * Command component to view a monthly work report.
 * Displays logged time entries for a selected month and year, compares against standard hours,
 * and provides an option to export the data as CSV.
 */
export default function ViewMonthlyWorkReportCommand() {
  const [allTimeEntries, setAllTimeEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth.toString()); // 0-indexed string

  /**
   * Fetches all time entries and projects from LocalStorage on component mount.
   */
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        setAllTimeEntries(await readItem("timeEntries"));
        setProjects(await readItem("projects"));
      } catch (error) {
        await showToast({ style: Toast.Style.Failure, title: "Failed to load data" });
        console.error("Failed to load data:", error);
      }
      setIsLoading(false);
    }
    fetchData();
  }, []);

  /**
   * Memoized mapping of project IDs to project names for quick lookup.
   */
  const projectMap = useMemo(() => {
    return projects.reduce(
      (acc, project) => {
        acc[project.id] = project.name;
        return acc;
      },
      {} as Record<string, string>,
    );
  }, [projects]);

  /**
   * Memoized array of time entries filtered by the selected year and month.
   * Entries are augmented with project names and sorted by date descending.
   */
  const filteredEntries = useMemo(() => {
    if (!selectedYear || !selectedMonth) return [];
    const year = parseInt(selectedYear);
    const month = parseInt(selectedMonth);

    return allTimeEntries
      .filter((entry) => {
        const entryDate = new Date(entry.date + "T00:00:00Z");
        return entryDate.getUTCFullYear() === year && entryDate.getUTCMonth() === month;
      })
      .map((entry) => ({
        ...entry,
        projectName: projectMap[entry.projectId] || "Unknown Project",
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allTimeEntries, selectedYear, selectedMonth, projectMap]);

  /**
   * Memoized calculation of total hours logged from the filtered entries.
   */
  const totalLoggedHours = useMemo(() => {
    return filteredEntries.reduce((sum, entry) => sum + entry.hours, 0);
  }, [filteredEntries]);

  /**
   * Memoized calculation of standard working hours for the selected month and year.
   * Uses the getStandardHours utility function.
   */
  const standardHoursForMonth = useMemo(() => {
    if (!selectedYear || !selectedMonth) return 0;
    try {
      return getStandardHours(parseInt(selectedYear), parseInt(selectedMonth));
    } catch (e) {
      console.error("Could not calculate standard hours for report:", e);
      // Potentially show a less intrusive warning or rely on default 0
      return 0;
    }
  }, [selectedYear, selectedMonth]);

  /**
   * Memoized calculation of the balance between logged hours and standard hours.
   */
  const balanceHours = useMemo(() => {
    return totalLoggedHours - standardHoursForMonth;
  }, [totalLoggedHours, standardHoursForMonth]);

  /**
   * Memoized array of available years for the year selection dropdown.
   * Includes all years from time entries plus the current year, sorted descending.
   */
  const years = useMemo(() => {
    const entryYears = new Set(allTimeEntries.map((e) => new Date(e.date + "T00:00:00Z").getUTCFullYear()));
    if (!entryYears.has(currentYear)) entryYears.add(currentYear);
    return Array.from(entryYears)
      .sort((a, b) => b - a)
      .map(String);
  }, [allTimeEntries]);

  /**
   * Handles changes from the month/year selection dropdown.
   * Updates selectedYear and selectedMonth state.
   * @param newValue The combined string value from the dropdown (e.g., "2023-6").
   */
  const handleMonthYearChange = (newValue: string) => {
    const [year, month] = newValue.split("-");
    setSelectedYear(year);
    setSelectedMonth(month);
  };

  /**
   * Memoized string representation of the currently selected period (e.g., "July 2023").
   */
  const currentPeriodString = useMemo(() => {
    if (!selectedMonth || !selectedYear) return ""; // Handle initial state
    return `${MONTH_NAMES[parseInt(selectedMonth)]} ${selectedYear}`;
  }, [selectedMonth, selectedYear]);

  /**
   * Memoized navigation title string, displaying summary information for the selected period.
   */
  const navigationTitle = useMemo(() => {
    let balanceText = balanceHours.toFixed(2);
    if (balanceHours >= 0) balanceText = "+" + balanceText; // Ensure + for positive or zero balance
    return `${currentPeriodString} | Logged: ${totalLoggedHours.toFixed(2)}h | Std: ${standardHoursForMonth.toFixed(2)}h | Bal: ${balanceText}h`;
  }, [currentPeriodString, totalLoggedHours, standardHoursForMonth, balanceHours]);

  // CSV string memoised for quick access
  const csvData = useMemo(
    () => convertToCSV(filteredEntries, currentPeriodString, totalLoggedHours, standardHoursForMonth, balanceHours),
    [filteredEntries, currentPeriodString, totalLoggedHours, standardHoursForMonth, balanceHours],
  );

  const handleDeleteEntry = async (entryId: string) => {
    try {
      const newEntries = allTimeEntries.filter((e) => e.id !== entryId);
      await writeItem("timeEntries", newEntries);
      setAllTimeEntries(newEntries);
      await showToast({
        style: Toast.Style.Success,
        title: "Entry Deleted",
        message: "The time entry has been successfully deleted.",
      });
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to delete entry" });
      console.error("Failed to delete entry:", error);
    }
  };

  // If user tries to copy when there's no data we still want to show information
  const handleCopyEmpty = async () => {
    await showToast({ title: "No Data to Export", message: "There are no entries for the selected period." });
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter entries by notes or project..."
      navigationTitle={navigationTitle}
      actions={
        <ActionPanel title="Monthly Report Actions">
          {filteredEntries.length > 0 ? (
            <Action.CopyToClipboard title="Copy Csv to Clipboard" content={csvData} icon={Icon.Download} />
          ) : (
            <Action title="Copy Csv to Clipboard" icon={Icon.Download} onAction={handleCopyEmpty} />
          )}
        </ActionPanel>
      }
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Month and Year"
          storeValue // Store the selected value
          value={selectedYear && selectedMonth ? `${selectedYear}-${selectedMonth}` : `${currentYear}-${currentMonth}`}
          onChange={handleMonthYearChange}
        >
          {years.map((year) => (
            <List.Dropdown.Section title={year} key={year}>
              {MONTH_NAMES.map((monthName, index) => (
                <List.Dropdown.Item key={`${year}-${index}`} title={monthName} value={`${year}-${index}`} />
              ))}
            </List.Dropdown.Section>
          ))}
        </List.Dropdown>
      }
    >
      {filteredEntries.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Time Entries Found"
          description={`No time logged for ${currentPeriodString}.\nAdd entries via 'Log Work Hours' command.`}
          icon={Icon.Calendar}
        />
      ) : (
        filteredEntries.map((entry: ReportEntry) => (
          <List.Item
            key={entry.id}
            title={`${entry.date} - ${typeof entry.hours === "number" ? entry.hours.toFixed(1) : "N/A"}h`}
            subtitle={entry.projectName}
            accessories={entry.notes ? [{ text: entry.notes }] : []}
            icon={Icon.Clock}
            actions={
              <ActionPanel title="Monthly Report Actions">
                {filteredEntries.length > 0 ? (
                  <Action.CopyToClipboard title="Copy Csv to Clipboard" content={csvData} icon={Icon.Download} />
                ) : (
                  <Action title="Copy Csv to Clipboard" icon={Icon.Download} onAction={handleCopyEmpty} />
                )}
                <Action
                  title="Delete Entry"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleDeleteEntry(entry.id)}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

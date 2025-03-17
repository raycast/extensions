import { ActionPanel, Action, Icon, List, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { getWhosOut, WhosOutEntry } from "./api/bamboohr";
import { formatDateRange, isOutToday, parseBambooHRDate } from "./utils/dateUtils";

interface Preferences {
  subdomain: string;
  apiKey?: string;
}

// View mode types - removed anniversaries
type ViewMode = "today" | "all";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [allEntries, setAllEntries] = useState<WhosOutEntry[]>([]);
  const [todayEntries, setTodayEntries] = useState<WhosOutEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Get preferences and log for debugging
  const preferences = getPreferenceValues<Preferences>();
  console.log(`Using subdomain: ${preferences.subdomain}`);
  console.log(`API key is ${preferences.apiKey ? "set" : "not set"}`);

  const [viewMode, setViewMode] = useState<ViewMode>("today");

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);

        // Verify API credentials
        if (!preferences.apiKey || !preferences.subdomain) {
          throw new Error("BambooHR API Key and Subdomain are required. Please check your extension preferences.");
        }

        // Fetch who's out data
        const data = await getWhosOut();
        setAllEntries(data);

        // Filter entries for people who are out today
        const outToday = data.filter((entry) => isOutToday(entry.start, entry.end));
        setTodayEntries(outToday);

        console.log(`Fetched ${outToday.length} people out today, ${data.length} total entries`);
      } catch (e) {
        console.error("Error fetching data:", e);
        if (e instanceof Error) {
          setError(e.message);
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to fetch data",
            message: e.message,
          });
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  if (error) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to fetch data from BambooHR"
          description={error}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open Bamboohr Documentation"
                url="https://documentation.bamboohr.com/reference/get-a-list-of-whos-out"
              />
              <Action.OpenInBrowser
                title="Open Bamboohr Calendar"
                url={`https://${preferences.subdomain}.bamboohr.com/calendar`}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="View Options"
          value={viewMode}
          onChange={(newValue: string) => setViewMode(newValue as ViewMode)}
        >
          <List.Dropdown.Item title="Out Today" value="today" icon={Icon.Calendar} />
          <List.Dropdown.Item title="All Upcoming Time Off" value="all" icon={Icon.Calendar} />
        </List.Dropdown>
      }
    >
      {(viewMode === "today" ? todayEntries : allEntries).length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Person}
          title={viewMode === "today" ? "No one is out today!" : "No upcoming time off"}
          description={
            viewMode === "today"
              ? "Everyone is in the office or working remotely."
              : "No one has scheduled time off in the next 30 days."
          }
        />
      ) : (
        (viewMode === "today" ? todayEntries : allEntries).map((entry: WhosOutEntry) => {
          // Use our dedicated BambooHR date parser to parse dates correctly
          // This correctly handles the 1-day offset issue
          const dateStart = parseBambooHRDate(entry.start);
          const dateEnd = parseBambooHRDate(entry.end);

          const formattedDateRange = formatDateRange(dateStart, dateEnd);

          return (
            <List.Item
              key={entry.id}
              icon={getIconForTimeOffType(entry.timeOffType)}
              title={entry.name}
              subtitle={formatTimeOffType(entry.timeOffType || entry.type)}
              accessories={[{ text: formattedDateRange }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    content={`${entry.name} is out of office (${formatTimeOffType(entry.timeOffType || entry.type)}) from ${formattedDateRange}`}
                  />
                  <Action.OpenInBrowser
                    title="Open Bamboohr Calendar"
                    url={`https://${preferences.subdomain}.bamboohr.com/calendar`}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

function getIconForTimeOffType(timeOffType?: string): Icon {
  if (!timeOffType) return Icon.Person;

  const type = timeOffType.toLowerCase();

  // Sun icon for vacation
  if (
    type.includes("vacation") ||
    type.includes("pto") ||
    type.includes("paid time off") ||
    type.includes("personal time off")
  ) {
    return Icon.Sun; // Changed to use Sun icon
  }
  // Heartbeat icon for sick leave
  else if (type.includes("sick") || type.includes("medical") || type.includes("doctor") || type.includes("health")) {
    return Icon.Heartbeat; // Changed to use Heartbeat icon
  }
  // Default calendar icon for everything else
  else {
    return Icon.Calendar;
  }
}

function formatTimeOffType(type: string): string {
  if (!type) return "Time Off";

  // Log the original type for debugging
  console.log(`Formatting time off type: "${type}"`);

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
    console.log(`Identified as Sick Pay: "${type}"`);
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
    console.log(`Identified as Vacation: "${type}"`);
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
    console.log(`Identified as Holiday: "${type}"`);
    return "Holiday";
  }
  // Default handling - keep original with formatting
  else {
    // For any other types, keep the original formatting
    const formatted = type
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
    console.log(`Using original formatted type: "${formatted}"`);
    return formatted;
  }
}

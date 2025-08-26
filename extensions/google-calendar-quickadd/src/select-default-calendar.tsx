import { List, ActionPanel, Action, Toast, showToast, LocalStorage, popToRoot } from "@raycast/api";
import { useState, useEffect } from "react";
import { authorize } from "./utils/oauth";
import { getCalendarList } from "./services/calendar";
import { Calendar } from "./types";

export default function SelectDefaultCalendar() {
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDefault, setCurrentDefault] = useState<string>("");

  useEffect(() => {
    async function fetchData() {
      try {
        const stored = await LocalStorage.getItem<string>("defaultCalendar");
        setCurrentDefault(stored || "primary");

        // Fetch calendars
        const token = await authorize();
        const calendarList = await getCalendarList(token);
        setCalendars(calendarList);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch calendars",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const selectCalendar = async (calendarId: string, calendarName: string) => {
    try {
      await LocalStorage.setItem("defaultCalendar", calendarId);
      await showToast({
        style: Toast.Style.Success,
        title: "Default Calendar Updated",
        message: `New events will be created in "${calendarName}"`,
      });
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update default calendar",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search calendars...">
      <List.Section title="Select Default Calendar">
        {calendars.map((calendar) => (
          <List.Item
            key={calendar.id}
            title={calendar.summary}
            subtitle={calendar.description || ""}
            icon={currentDefault === calendar.id ? "✅" : "📅"}
            accessories={[
              { text: calendar.primary ? "Primary" : "" },
              { text: currentDefault === calendar.id ? "Current Default" : "" },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Set as Default Calendar"
                  onAction={() => selectCalendar(calendar.id, calendar.summary)}
                />
                <Action.CopyToClipboard
                  title="Copy Calendar ID"
                  content={calendar.id}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

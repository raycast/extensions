import { List, ActionPanel, Action, Toast, showToast, LocalStorage, popToRoot, Icon, Keyboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { authorize } from "./utils/oauth";
import { getCalendarList } from "./services/calendar";
import { Calendar } from "./types";

export default function SelectDefaultCalendar() {
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDefault, setCurrentDefault] = useState<string>("");
  const [hiddenCalendars, setHiddenCalendars] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchData() {
      try {
        const stored = await LocalStorage.getItem<string>("defaultCalendar");
        setCurrentDefault(stored || "primary");

        // Load hidden calendars
        const hidden = await LocalStorage.getItem<string>("hiddenCalendars");
        if (hidden) {
          try {
            const hiddenArray = JSON.parse(hidden) as string[];
            setHiddenCalendars(new Set(hiddenArray));
          } catch {
            setHiddenCalendars(new Set());
          }
        }

        // Fetch calendars
        const token = await authorize();
        const calendarList = await getCalendarList(token);
        setCalendars(calendarList);
      } catch (error) {
        showFailureToast(error, { title: "Failed to fetch calendars" });
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
      showFailureToast(error, { title: "Failed to update default calendar" });
    }
  };

  const removeCalendar = async (calendarId: string, calendarName: string) => {
    try {
      const newHiddenCalendars = new Set(hiddenCalendars);
      newHiddenCalendars.add(calendarId);
      setHiddenCalendars(newHiddenCalendars);

      await LocalStorage.setItem("hiddenCalendars", JSON.stringify(Array.from(newHiddenCalendars)));
      if (currentDefault === calendarId) {
        await LocalStorage.setItem("defaultCalendar", "primary");
        setCurrentDefault("primary");
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Calendar Hidden",
        message: `"${calendarName}" has been hidden from the list`,
      });
    } catch (error) {
      showFailureToast(error, { title: "Failed to hide calendar" });
    }
  };

  const resetCalenders = async () => {
    try {
      await LocalStorage.setItem("hiddenCalendars", JSON.stringify([]));
      setHiddenCalendars(new Set());
      await showToast({
        style: Toast.Style.Success,
        title: "Calendars Reset",
        message: "All calendars have been reset",
      });
    } catch (error) {
      showFailureToast(error, { title: "Failed to reset calendars" });
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search calendars...">
      <List.Section title="Select Default Calendar">
        {calendars
          .filter((calendar) => !hiddenCalendars.has(calendar.id))
          .map((calendar) => (
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
                    icon={Icon.Checkmark}
                    onAction={() => selectCalendar(calendar.id, calendar.summary)}
                  />
                  <Action.CopyToClipboard
                    title="Copy Calendar ID"
                    content={calendar.id}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                  <ActionPanel.Section>
                    <Action
                      title="Hide Calendar"
                      icon={Icon.EyeDisabled}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd"], key: "h" }}
                      onAction={() => removeCalendar(calendar.id, calendar.summary)}
                    />
                    <Action
                      title={`Reset Calendars (${hiddenCalendars.size})`}
                      icon={Icon.RotateClockwise}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                      style={Action.Style.Destructive}
                      onAction={resetCalenders}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  );
}

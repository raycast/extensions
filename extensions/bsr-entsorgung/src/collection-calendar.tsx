import { Action, ActionPanel, Icon, List, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { useEffect, useState } from "react";
import { CollectionEvent, formatDate, getAddressId, getCalendarICS, parseICS } from "./api";

const BSR_CALENDAR_URL = "https://www.bsr.de/abfuhrkalender";

type LoadState = "idle" | "loading" | "done" | "error";

function getUpcomingMonths(): Array<{ year: number; month: number }> {
  const now = new Date();
  return [
    { year: now.getFullYear(), month: now.getMonth() + 1 },
    {
      year: now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear(),
      month: now.getMonth() === 11 ? 1 : now.getMonth() + 2,
    },
  ];
}

function groupByDate(events: CollectionEvent[]): Map<string, CollectionEvent[]> {
  const map = new Map<string, CollectionEvent[]>();
  for (const event of events) {
    const existing = map.get(event.date) ?? [];
    existing.push(event);
    map.set(event.date, existing);
  }
  return map;
}

export default function CollectionCalendar() {
  const { street, houseNumber } = getPreferenceValues<Preferences.CollectionCalendar>();
  const [state, setState] = useState<LoadState>("idle");
  const [events, setEvents] = useState<CollectionEvent[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!street || !houseNumber) return;
    setState("loading");

    const controller = new AbortController();

    async function load() {
      try {
        const addressId = await getAddressId(street!, houseNumber!, controller.signal);
        const months = getUpcomingMonths();
        const icsResults = await Promise.all(
          months.map(({ year, month }) => getCalendarICS(addressId, year, month, controller.signal)),
        );
        const allEvents = icsResults.flatMap(parseICS);
        // Only show future events (from today)
        const today = new Date().toISOString().slice(0, 10);
        const upcoming = allEvents.filter((e) => e.date >= today);
        setEvents(upcoming);
        setState("done");
      } catch (err) {
        // Ignore abort errors triggered by cleanup
        if (err instanceof Error && err.name === "AbortError") return;
        setErrorMsg(err instanceof Error ? err.message : String(err));
        setState("error");
      }
    }

    load();

    return () => controller.abort();
  }, [street, houseNumber]);

  // No address configured
  if (!street || !houseNumber) {
    return (
      <List>
        <List.EmptyView
          title="Address Not Configured"
          description="Please enter your Berlin address in the extension preferences."
          icon={Icon.House}
          actions={
            <ActionPanel>
              <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (state === "error") {
    return (
      <List>
        <List.EmptyView
          title="Failed to Load"
          description={errorMsg || "Could not load the collection calendar."}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open BSR Calendar" url={BSR_CALENDAR_URL} icon={Icon.Globe} />
              <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const grouped = groupByDate(events);
  const sortedDates = [...grouped.keys()].sort();

  return (
    <List isLoading={state === "loading"} navigationTitle={`${street} ${houseNumber}`}>
      {sortedDates.length === 0 && state === "done" ? (
        <List.EmptyView
          title="No Collection Dates Found"
          description="No collection dates are scheduled for the next two months."
          icon={Icon.Calendar}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open BSR Calendar" url={BSR_CALENDAR_URL} icon={Icon.Globe} />
            </ActionPanel>
          }
        />
      ) : (
        sortedDates.map((date) => {
          const dayEvents = grouped.get(date)!;
          const label = formatDate(date);
          const icons = dayEvents.map((e) => e.icon).join(" ");
          const summaries = dayEvents.map((e) => e.summary).join(", ");

          return (
            <List.Item
              key={date}
              title={label}
              subtitle={icons + "  " + summaries}
              icon={Icon.Calendar}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open BSR Calendar" url={BSR_CALENDAR_URL} icon={Icon.Globe} />
                  <Action.CopyToClipboard
                    title="Copy Date"
                    content={`${label}: ${summaries}`}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action
                    title="Open Preferences"
                    icon={Icon.Gear}
                    onAction={openExtensionPreferences}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
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

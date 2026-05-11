import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useState, useMemo, useEffect } from "react";
import { getEventsForYear } from "./utils/holidays";
import { differenceInDays, format } from "date-fns";
import { getDateDiff } from "./utils/date-utils";
import DayDetailView from "./view-day-detail";

export default function ViewEvents() {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();

  const { sections, nearestEventId } = useMemo(() => {
    const events = getEventsForYear(currentYear);
    const today = new Date();

    // Group by month
    const sections = [];
    for (let i = 0; i < 12; i++) {
      const monthEvents = events.filter((e) => e.date.getMonth() === i);
      if (monthEvents.length > 0) {
        sections.push({
          monthName: format(new Date(currentYear, i, 1), "MMMM"),
          events: monthEvents,
        });
      }
    }

    // Find nearest event to today
    let nearestEventId: string | undefined;
    let minDiff = Infinity;
    events.forEach((event) => {
      const diff = Math.abs(differenceInDays(event.date, today));
      if (diff < minDiff) {
        minDiff = diff;
        nearestEventId = event.id;
      }
    });

    return { events, sections, nearestEventId };
  }, [currentYear]);

  useEffect(() => {
    if (nearestEventId) {
      setTimeout(() => {
        setSelectedItemId(nearestEventId);
      }, 200);
    }
  }, [nearestEventId]);

  const handleNextYear = () => setCurrentYear(currentYear + 1);
  const handlePreviousYear = () => setCurrentYear(currentYear - 1);
  const handleGoToToday = () => setCurrentYear(new Date().getFullYear());

  return (
    <List
      navigationTitle={`Events in ${currentYear}`}
      searchBarPlaceholder={`Search events in ${currentYear}...`}
      selectedItemId={selectedItemId}
      onSelectionChange={(id) => setSelectedItemId(id || undefined)}
    >
      {sections.map((section) => (
        <List.Section key={section.monthName} title={section.monthName}>
          {section.events.map((event) => (
            <List.Item
              id={event.id}
              key={event.id}
              title={event.name}
              subtitle={`${format(event.date, "EEE, MMM d")} ${event.type === "lunar" ? `(AL: ${event.lunarDate})` : ""}`}
              accessories={[
                {
                  tag:
                    event.type === "lunar"
                      ? { value: "Lunar", color: "#FF6363" }
                      : { value: "Solar", color: "#4D8FFF" },
                },
                { text: getDateDiff(event.date) },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Day Details"
                    target={<DayDetailView date={event.date} />}
                    icon={Icon.Sidebar}
                  />
                  <Action
                    title="Next Year"
                    onAction={handleNextYear}
                    icon={Icon.ArrowRight}
                    shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
                  />
                  <Action
                    title="Previous Year"
                    onAction={handlePreviousYear}
                    icon={Icon.ArrowLeft}
                    shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
                  />
                  <Action
                    title="Go to Current Year"
                    onAction={handleGoToToday}
                    icon={Icon.Calendar}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                  />
                  <Action.CopyToClipboard
                    content={`${event.name} - ${format(event.date, "dd/MM/yyyy")}`}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
      <List.EmptyView
        title="No Events Found"
        description={`No holidays found for year ${currentYear}.`}
      />
    </List>
  );
}

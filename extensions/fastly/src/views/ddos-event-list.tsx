import { List, ActionPanel, Action, Icon, Color, showToast, Toast, Keyboard } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { DdosProtectionEvent, FastlyService } from "../types";
import { getDdosEvents } from "../api";
import { DdosEventRules } from "./ddos-event-rules";

const TIME_RANGES = [
  { id: "1", title: "Last 24 Hours" },
  { id: "7", title: "Last 7 Days" },
  { id: "30", title: "Last 30 Days" },
];

interface DdosEventListProps {
  service: FastlyService;
}

export function DdosEventList({ service }: DdosEventListProps) {
  const [events, setEvents] = useState<DdosProtectionEvent[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [days, setDays] = useState("7");
  const [isLoading, setIsLoading] = useState(true);
  // Guards against a slow, superseded load overwriting a newer range's results
  const loadSeq = useRef(0);

  useEffect(() => {
    loadEvents();
  }, [days]);

  async function loadEvents(cursor?: string) {
    const seq = ++loadSeq.current;
    try {
      setIsLoading(true);
      const from = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000).toISOString();
      const response = await getDdosEvents({ serviceId: service.id, from, cursor });
      if (seq !== loadSeq.current) return;
      setEvents((current) => (cursor ? [...current, ...(response.data || [])] : response.data || []));
      setNextCursor(response.meta?.next_cursor || undefined);
    } catch (error) {
      console.error("Error loading DDoS events:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load attack events",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      if (seq === loadSeq.current) {
        setIsLoading(false);
      }
    }
  }

  function eventAccessories(event: DdosProtectionEvent): List.Item.Accessory[] {
    const accessories: List.Item.Accessory[] = [];
    const active = !!event.started_at && !event.ended_at;

    if (active) {
      accessories.push({ tag: { value: "Active", color: Color.Red }, tooltip: "This attack is ongoing" });
    }
    if (event.requests_detected != null) {
      accessories.push({
        text: `${event.requests_detected.toLocaleString()} detected`,
        tooltip: "Requests classified as attack traffic",
      });
    }
    if (event.requests_allowed != null) {
      accessories.push({
        text: `${event.requests_allowed.toLocaleString()} allowed`,
        tooltip: "Requests classified as legitimate traffic",
      });
    }
    if (event.started_at) {
      accessories.push({
        date: new Date(event.started_at),
        tooltip: `Started: ${new Date(event.started_at).toLocaleString()}${
          event.ended_at ? `\nEnded: ${new Date(event.ended_at).toLocaleString()}` : ""
        }`,
      });
    }
    return accessories;
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Attack Events — ${service.name}`}
      searchBarPlaceholder="Search attack events..."
      searchBarAccessory={
        <List.Dropdown tooltip="Time Range" value={days} onChange={setDays}>
          {TIME_RANGES.map((range) => (
            <List.Dropdown.Item key={range.id} value={range.id} title={range.title} />
          ))}
        </List.Dropdown>
      }
    >
      {events.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Attack Events"
          description="No DDoS events were detected on this service in the selected time range."
          icon={Icon.Checkmark}
        />
      ) : (
        <>
          {events.map((event) => (
            <List.Item
              key={event.id}
              title={event.name || event.id}
              icon={{ source: Icon.Bolt, tintColor: event.ended_at ? Color.SecondaryText : Color.Red }}
              accessories={eventAccessories(event)}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Mitigation Rules"
                    icon={Icon.List}
                    target={<DdosEventRules event={event} service={service} />}
                  />
                  <Action.CopyToClipboard
                    title="Copy Event ID"
                    content={event.id}
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "c" },
                      Windows: { modifiers: ["ctrl", "shift"], key: "c" },
                    }}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={() => loadEvents()}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                  />
                </ActionPanel>
              }
            />
          ))}
          {nextCursor && (
            <List.Item
              key="load-more"
              title="Load More Events…"
              icon={Icon.Ellipsis}
              actions={
                <ActionPanel>
                  <Action title="Load More" icon={Icon.Ellipsis} onAction={() => loadEvents(nextCursor)} />
                </ActionPanel>
              }
            />
          )}
        </>
      )}
    </List>
  );
}

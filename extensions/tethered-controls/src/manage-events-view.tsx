import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import EventForm from "./event-form";
import { refreshEventsSubtitle } from "./event-subtitle";
import { actionTitle, eventRequest, eventSummary, listEvents, TetheredEvent, valuesForEvent } from "./events";

export default function Command() {
  const [events, setEvents] = useState<TetheredEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  async function reload() {
    setIsLoading(true);
    try {
      const upcoming = await listEvents();
      setEvents(upcoming);
      await refreshEventsSubtitle(upcoming);
      setError(undefined);
    } catch (error) {
      await refreshEventsSubtitle([]);
      setError(error instanceof Error ? error.message : String(error));
      await showFailureToast(error, { title: "Could not load events" });
    } finally {
      setIsLoading(false);
    }
  }
  useEffect(() => {
    void reload();
  }, []);

  async function mutate(event: TetheredEvent, operation: "delete" | "toggle") {
    if (busy) return;
    if (
      operation === "delete" &&
      !(await confirmAlert({
        title: `Delete ${actionTitle(event.action)} event?`,
        message: "This removes the selected event from Tethered or the macOS power schedule.",
        primaryAction: { title: "Delete Event", style: Alert.ActionStyle.Destructive },
      }))
    )
      return;
    setBusy(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Updating event" });
    try {
      await eventRequest("manage", {
        operation,
        id: event.id,
        ...(operation === "toggle" ? { enabled: String(!event.enabled) } : {}),
      });
      toast.style = Toast.Style.Success;
      toast.title =
        operation === "delete"
          ? "Event deleted"
          : event.enabled
            ? "Repeating event disabled"
            : "Repeating event enabled";
      await reload();
    } catch (error) {
      await toast.hide();
      await showFailureToast(error, { title: "Could not update event" });
    } finally {
      setBusy(false);
    }
  }
  const navigation = (
    <>
      <Action
        title="Refresh Events"
        icon={Icon.ArrowClockwise}
        onAction={reload}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
      <Action.Push
        title="Create Scheduled Event"
        target={<EventForm repeating={false} onSaved={() => void reload()} refreshSubtitleOnSave={false} />}
      />
      <Action.Push
        title="Create Repeating Event"
        target={<EventForm repeating={true} onSaved={() => void reload()} refreshSubtitleOnSave={false} />}
      />
    </>
  );
  return (
    <List
      isLoading={isLoading || busy}
      isShowingDetail
      searchBarPlaceholder="Search upcoming and disabled events"
      navigationTitle="Tethered Events"
    >
      <List.EmptyView
        title={error ? "Could Not Load Events" : "No Scheduled Events"}
        description={error ?? "Create a scheduled or repeating event to get started."}
        actions={<ActionPanel>{navigation}</ActionPanel>}
      />
      {[true, false].map((enabled) => (
        <List.Section key={String(enabled)} title={enabled ? "Upcoming Events" : "Disabled Repeating Events"}>
          {events
            .filter((event) => event.enabled === enabled)
            .map((event) => (
              <List.Item
                key={event.id}
                title={actionTitle(event.action)}
                subtitle={event.enabled ? new Date(event.date * 1000).toLocaleString() : "Disabled"}
                icon={event.enabled ? Icon.Calendar : Icon.Pause}
                detail={
                  <List.Item.Detail
                    markdown={`${eventSummary(valuesForEvent(event), event.repeating).replace("Next:", event.enabled ? "Next:" : "Next if enabled:")}\n\n${event.enabled ? "Enabled" : "Disabled — no upcoming run"}${event.pending ? "\n\nWaiting for AC power" : ""}\n\n${event.source === "power" ? "macOS power event" : "Tethered app action"}`}
                  />
                }
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Edit Event"
                      icon={Icon.Pencil}
                      target={
                        <EventForm
                          repeating={event.repeating}
                          event={event}
                          onSaved={() => void reload()}
                          refreshSubtitleOnSave={false}
                        />
                      }
                    />
                    {event.repeating && (
                      <Action
                        title={event.enabled ? "Disable Repeating Event" : "Enable Repeating Event"}
                        icon={event.enabled ? Icon.Pause : Icon.Play}
                        onAction={() => mutate(event, "toggle")}
                      />
                    )}
                    <Action
                      title="Delete Event"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => mutate(event, "delete")}
                    />
                    {navigation}
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}

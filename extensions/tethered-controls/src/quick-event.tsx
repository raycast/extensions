import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useMemo, useState } from "react";
import EventForm from "./event-form";
import { refreshEventsSubtitle } from "./event-subtitle";
import { actionTitle, eventParameters, eventRequest, eventSummary, powerActions } from "./events";
import { parseEvent } from "./parse-event";

export default function Command() {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const preview = useMemo(() => {
    try {
      return { event: parseEvent(input), error: undefined };
    } catch (error) {
      return { event: undefined, error: error instanceof Error ? error.message : String(error) };
    }
  }, [input]);
  const event = preview.event;

  async function create() {
    if (!event || busy || saved) return;
    setBusy(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating event" });
    try {
      await eventRequest("create", eventParameters(event.values, event.repeating));
      await refreshEventsSubtitle();
      setSaved(true);
      toast.style = Toast.Style.Success;
      toast.title = "Event created";
    } catch (error) {
      await toast.hide();
      await showFailureToast(error, { title: "Could not confirm event creation" });
    } finally {
      setBusy(false);
    }
  }
  const examples =
    "Examples:\n\n- sleep in 30 minutes\n- low power weekdays at 9am for 2 hours\n- wake every Monday and Friday at 8am\n- brightness 50% tomorrow at 9am for 1 hour\n- topup on tomorrow at 7am wait for ac 30 minutes\n\nEnter creates the previewed event. Edit Details opens the form. Ambiguous or incomplete input is never submitted.";
  return (
    <List
      isLoading={busy}
      filtering={false}
      isShowingDetail
      searchText={input}
      onSearchTextChange={(value) => {
        if (!busy) {
          setInput(value);
          setSaved(false);
        }
      }}
      searchBarPlaceholder="sleep in 30 minutes"
      navigationTitle="Quick Event"
    >
      {event ? (
        <List.Item
          id="preview"
          title={saved ? "Event Created" : actionTitle(event.values.action)}
          subtitle={event.nextDate.toLocaleString()}
          icon={saved ? Icon.Checkmark : Icon.Calendar}
          detail={
            <List.Item.Detail
              markdown={`${eventSummary(event.values, event.repeating)}\n\n${powerActions.has(event.values.action) ? "macOS power event. Administrator authorization may be required." : "Requires Tethered running and the Mac awake."}${event.repeating && powerActions.has(event.values.action) ? " Existing conflicting power events will not be replaced. Use Edit Details to explicitly allow replacement." : ""}`}
            />
          }
          actions={
            <ActionPanel>
              {!saved && <Action title="Create Event" icon={Icon.Plus} onAction={create} />}
              {!saved && (
                <Action.Push
                  title="Edit Details"
                  icon={Icon.Pencil}
                  target={
                    <EventForm repeating={event.repeating} initial={event.values} onSaved={() => setSaved(true)} />
                  }
                />
              )}
              {saved && (
                <Action
                  title="Create Another Event"
                  onAction={() => {
                    setInput("");
                    setSaved(false);
                  }}
                />
              )}
            </ActionPanel>
          }
        />
      ) : (
        <List.Item
          id="help"
          title={input ? "Complete Your Event" : "Type an Event"}
          subtitle={input ? preview.error : "Preview updates as you type"}
          detail={<List.Item.Detail markdown={`${input ? `${preview.error}\n\n` : ""}${examples}`} />}
        />
      )}
    </List>
  );
}

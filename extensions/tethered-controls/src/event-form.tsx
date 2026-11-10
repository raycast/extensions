import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useRef, useState } from "react";
import { refreshEventsSubtitle } from "./event-subtitle";
import {
  actions,
  days,
  durationActions,
  powerActions,
  eventParameters,
  eventRequest,
  eventSummary,
  valuesForEvent,
  EventValues,
  TetheredEvent,
} from "./events";

type Props = {
  repeating: boolean;
  event?: TetheredEvent;
  initial?: EventValues;
  onSaved?: () => void;
  refreshSubtitleOnSave?: boolean;
};

export default function EventForm({ repeating, event, initial, onSaved, refreshSubtitleOnSave = true }: Props) {
  const [values, setValues] = useState<EventValues>(() =>
    event
      ? valuesForEvent(event)
      : (initial ?? {
          action: "sleep",
          weekdays: ["M", "T", "W", "R", "F"],
          time: "",
          mode: "system",
          percent: "50",
        }),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const revision = useRef(0);
  const saving = useRef(false);
  const { pop } = useNavigation();
  const control = values.action === "brightness" || values.action === "fans";
  const update = (change: Partial<EventValues>) => {
    revision.current += 1;
    setValues((previous) => ({ ...previous, ...change }));
    setSaved(false);
  };

  async function submit() {
    if (saving.current || saved) return;
    saving.current = true;
    const submittedRevision = revision.current;
    setIsLoading(true);
    let toast: Toast | undefined;
    try {
      const query = eventParameters(values, repeating);
      if (event) query.id = event.id;
      toast = await showToast({ style: Toast.Style.Animated, title: event ? "Updating event" : "Saving event" });
      const result = await eventRequest("create", query);
      if (refreshSubtitleOnSave) await refreshEventsSubtitle();
      const unchanged = revision.current === submittedRevision;
      setSaved(unchanged);
      toast.style = Toast.Style.Success;
      toast.title = unchanged ? (event ? "Event updated" : "Event saved") : "Previous settings saved";
      toast.message = unchanged
        ? result.message
        : event
          ? "Your newer changes are still unsaved. Save again to apply them."
          : "An event was created with the earlier values. Your newer values remain here; submitting again creates another event.";
      onSaved?.();
      if (event && unchanged) pop();
    } catch (error) {
      await toast?.hide();
      await showFailureToast(error, { title: "Could not confirm event save" });
    } finally {
      saving.current = false;
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={event ? "Edit Event" : repeating ? "Create Repeating Event" : "Create Scheduled Event"}
      actions={
        <ActionPanel>
          {saved ? (
            <Action title="Create Another Event" onAction={() => setSaved(false)} />
          ) : (
            <Action.SubmitForm title={event ? "Save Changes" : "Create Event"} onSubmit={submit} />
          )}
        </ActionPanel>
      }
    >
      <Form.Description
        text={
          saved
            ? "Event saved in Tethered."
            : "Times use your Mac’s timezone. App actions require Tethered to be running and the Mac awake. Power events may request administrator authorization."
        }
      />
      {event && !event.enabled && (
        <Form.Description text="This repeating event is disabled. Saving changes keeps it disabled." />
      )}
      <Form.Dropdown id="action" title="Event" value={values.action} onChange={(action) => update({ action })}>
        {actions
          .filter(([action]) => !event || powerActions.has(action) === (event.source === "power"))
          .map(([value, title]) => (
            <Form.Dropdown.Item key={value} value={value} title={title} />
          ))}
      </Form.Dropdown>
      {repeating ? (
        <>
          <Form.TagPicker
            id="weekdays"
            title="Repeat On"
            value={values.weekdays ?? []}
            onChange={(weekdays) => update({ weekdays })}
          >
            {days.map(([value, title]) => (
              <Form.TagPicker.Item key={value} value={value} title={title} />
            ))}
          </Form.TagPicker>
          <Form.TextField
            id="time"
            title="Time"
            value={values.time ?? ""}
            onChange={(time) => update({ time })}
            placeholder="09:30"
            info="24-hour time (HH:MM)."
          />
          {!event && powerActions.has(values.action) && (
            <Form.Checkbox
              id="replace"
              label="Replace a conflicting repeating power event"
              value={values.replace ?? false}
              onChange={(replace) => update({ replace })}
              info="One repeating wake/power-on slot and one sleep/shutdown slot. The other slot is preserved."
            />
          )}
        </>
      ) : (
        <Form.DatePicker
          id="date"
          title="Date and Time"
          type={Form.DatePicker.Type.DateTime}
          value={values.date ?? null}
          onChange={(date) => update({ date })}
          min={new Date()}
        />
      )}
      {control && (
        <>
          <Form.Dropdown
            id="mode"
            title="Control"
            value={values.mode ?? "system"}
            onChange={(mode) => update({ mode })}
          >
            <Form.Dropdown.Item value="system" title="System" />
            <Form.Dropdown.Item value="fixed" title="Fixed Percentage" />
          </Form.Dropdown>
          {values.mode === "fixed" && (
            <Form.TextField
              id="percent"
              title="Percentage"
              value={values.percent ?? ""}
              onChange={(percent) => update({ percent })}
              placeholder="50"
            />
          )}
        </>
      )}
      {durationActions.has(values.action) && (
        <Form.TextField
          id="duration"
          title="Duration (minutes)"
          value={values.duration ?? ""}
          onChange={(duration) => update({ duration })}
          placeholder="0"
          info="0 or blank means no expiration."
        />
      )}
      {values.action === "topupOn" && (
        <Form.TextField
          id="wait"
          title="Wait for AC (minutes)"
          value={values.wait ?? ""}
          onChange={(wait) => update({ wait })}
          placeholder="0"
          info="0 means run only if already connected."
        />
      )}
      <Form.Separator />
      <Form.Description title="Preview" text={eventSummary(values, repeating).replace(/\*\*/g, "")} />
    </Form>
  );
}

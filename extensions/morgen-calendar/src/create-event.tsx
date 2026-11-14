import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { isoDuration, systemTimeZone, formEventTime } from "./lib/dates";
import { createEvent, listCalendars } from "./lib/morgen";
import { showFailure, showSuccess } from "./lib/ui";
import type { Calendar } from "./types";
import { calendarKey } from "./lib/calendar-key";

interface Values {
  title: string;
  calendar: string;
  start: Date;
  startTime: string;
  duration: string;
  allDay: boolean;
  description: string;
}

export default function CreateEvent() {
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [allDay, setAllDay] = useState(false);
  const saving = useRef(false);
  const [hasError, setHasError] = useState(false);
  const { pop } = useNavigation();

  useEffect(() => {
    let active = true;
    listCalendars()
      .then((result) => {
        if (active) setCalendars(result);
      })
      .catch(async (error) => {
        if (!active) return;
        setHasError(true);
        await showFailure(error).catch(() => {});
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const writable = calendars.filter((calendar) => calendar.myRights?.mayWriteAll || calendar.myRights?.mayWriteOwn);

  async function submit(values: Values) {
    if (saving.current || loading || hasError) return;
    const calendar = writable.find((item) => calendarKey(item) === values.calendar);
    if (!calendar || !values.title.trim() || !values.start) {
      await showFailure(new Error("Enter a title, start time, and writable calendar."));
      return;
    }
    saving.current = true;
    setSubmitting(true);
    try {
      await createEvent({
        accountId: calendar.accountId,
        calendarId: calendar.id,
        title: values.title.trim(),
        description: values.description.trim() || undefined,
        ...formEventTime(values.start, values.startTime, values.allDay),
        duration: values.allDay ? "P1D" : isoDuration(Number(values.duration)),
      });
      await showSuccess("Event created");
      pop();
    } catch (error) {
      await showFailure(error);
    } finally {
      saving.current = false;
      setSubmitting(false);
    }
  }

  const defaultStart = new Date();
  defaultStart.setMinutes(0, 0, 0);
  defaultStart.setHours(defaultStart.getHours() + 1);

  return (
    <Form
      isLoading={loading || submitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Event" icon={Icon.Calendar} onSubmit={submit} />
        </ActionPanel>
      }
    >
      {hasError && (
        <Form.Description
          title="Unable to Load Calendars"
          text="Calendar choices are unavailable. Check the error and reopen this command later."
        />
      )}
      <Form.TextField id="title" title="Title" placeholder="Team meeting" autoFocus />
      <Form.Dropdown id="calendar" title="Calendar" info="Only calendars where you can create events are shown.">
        {writable.map((calendar) => (
          <Form.Dropdown.Item
            key={calendarKey(calendar)}
            value={calendarKey(calendar)}
            title={`${calendar["morgen.so:metadata"]?.overrideName || calendar.name} · ${calendar.integrationId || "Calendar"}`}
          />
        ))}
      </Form.Dropdown>
      <Form.DatePicker id="start" title="Start" defaultValue={defaultStart} type={Form.DatePicker.Type.Date} />
      {!allDay && (
        <Form.TextField
          id="startTime"
          title="Start Time"
          placeholder="HH:mm"
          defaultValue={`${String(defaultStart.getHours()).padStart(2, "0")}:00`}
        />
      )}
      <Form.Checkbox id="allDay" label="All-day event" title="All Day" value={allDay} onChange={setAllDay} />
      {!allDay && (
        <Form.Dropdown id="duration" title="Duration" defaultValue="60">
          {[15, 30, 45, 60, 90, 120, 180, 240].map((minutes) => (
            <Form.Dropdown.Item key={minutes} value={String(minutes)} title={`${minutes} minutes`} />
          ))}
        </Form.Dropdown>
      )}
      <Form.Description text={`Timed events use your local time zone: ${systemTimeZone()}.`} />
      <Form.TextArea id="description" title="Description" placeholder="Optional details" />
    </Form>
  );
}

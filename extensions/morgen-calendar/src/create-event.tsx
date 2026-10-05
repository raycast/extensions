import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { isoDuration, systemTimeZone, toLocalDateTime } from "./lib/dates";
import { createEvent, listCalendars } from "./lib/morgen";
import { showFailure, showSuccess } from "./lib/ui";
import type { Calendar } from "./types";

interface Values {
  title: string;
  calendar: string;
  start: Date;
  duration: string;
  allDay: boolean;
  description: string;
}

function dateOnly(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T00:00:00`;
}

export default function CreateEvent() {
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [allDay, setAllDay] = useState(false);
  const { pop } = useNavigation();

  useEffect(() => {
    listCalendars()
      .then(setCalendars)
      .catch(showFailure)
      .finally(() => setLoading(false));
  }, []);

  const writable = calendars.filter((calendar) => calendar.myRights?.mayWriteAll || calendar.myRights?.mayWriteOwn);

  async function submit(values: Values) {
    const calendar = writable.find((item) => item.id === values.calendar);
    if (!calendar || !values.title.trim() || !values.start) {
      await showFailure(new Error("Enter a title, start time, and writable calendar."));
      return;
    }
    setSubmitting(true);
    try {
      await createEvent({
        accountId: calendar.accountId,
        calendarId: calendar.id,
        title: values.title.trim(),
        description: values.description.trim() || undefined,
        start: values.allDay ? dateOnly(values.start) : toLocalDateTime(values.start, systemTimeZone()),
        duration: values.allDay ? "P1D" : isoDuration(Number(values.duration)),
        timeZone: values.allDay ? null : systemTimeZone(),
        showWithoutTime: values.allDay,
      });
      await showSuccess("Event created");
      pop();
    } catch (error) {
      await showFailure(error);
    } finally {
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
      <Form.TextField id="title" title="Title" placeholder="Team meeting" autoFocus />
      <Form.Dropdown id="calendar" title="Calendar" info="Only calendars where you can create events are shown.">
        {writable.map((calendar) => (
          <Form.Dropdown.Item
            key={calendar.id}
            value={calendar.id}
            title={`${calendar["morgen.so:metadata"]?.overrideName || calendar.name} · ${calendar.integrationId || "Calendar"}`}
          />
        ))}
      </Form.Dropdown>
      <Form.DatePicker
        id="start"
        title="Start"
        defaultValue={defaultStart}
        type={allDay ? Form.DatePicker.Type.Date : Form.DatePicker.Type.DateTime}
      />
      <Form.Checkbox id="allDay" label="All-day event" title="All Day" value={allDay} onChange={setAllDay} />
      {!allDay && (
        <Form.Dropdown id="duration" title="Duration" defaultValue="60">
          {[15, 30, 45, 60, 90, 120, 180, 240].map((minutes) => (
            <Form.Dropdown.Item key={minutes} value={String(minutes)} title={`${minutes} minutes`} />
          ))}
        </Form.Dropdown>
      )}
      <Form.Description text={`Timed events use your Windows time zone: ${systemTimeZone()}.`} />
      <Form.TextArea id="description" title="Description" placeholder="Optional details" />
    </Form>
  );
}

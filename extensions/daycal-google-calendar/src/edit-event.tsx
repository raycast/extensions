import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useRef, useState } from "react";
import { updateEvent } from "./lib/google";
import { GoogleCalendarEntry, GoogleEvent } from "./lib/types";

interface Props {
  calendar: GoogleCalendarEntry;
  event: GoogleEvent;
  onSaved: () => Promise<void> | void;
}

type Values = {
  title: string;
  start: Date | null;
  end: Date | null;
  location: string;
  description: string;
};

function calendarDisplayName(calendar: GoogleCalendarEntry): string {
  const displayName =
    calendar.summaryOverride?.trim() || calendar.summary?.trim() || "";

  if (
    calendar.primary &&
    (!displayName ||
      displayName === calendar.id ||
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(displayName))
  ) {
    return "Personal (Primary)";
  }

  return displayName || "Calendar";
}

function parseDateOnly(value: string | undefined): Date | null {
  if (!value) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  // Use local noon rather than midnight so date-only values stay stable across
  // timezone/DST boundaries while Raycast's DatePicker works with Date objects.
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function formatDateOnly(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addCalendarDays(value: Date, days: number): Date {
  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate() + days,
    12,
    0,
    0,
    0,
  );
}

function calendarDayNumber(value: Date): number {
  return Math.floor(
    Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) /
      86_400_000,
  );
}

export default function EditEvent({ calendar, event, onSaved }: Props) {
  const { pop } = useNavigation();
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [title, setTitle] = useState(event.summary || "");
  const [location, setLocation] = useState(event.location || "");
  const [description, setDescription] = useState(event.description || "");

  const allDay = Boolean(event.start.date && !event.start.dateTime);

  const initialStart = allDay
    ? parseDateOnly(event.start.date)
    : event.start.dateTime
      ? new Date(event.start.dateTime)
      : null;

  const exclusiveAllDayEnd = allDay ? parseDateOnly(event.end.date) : null;
  const initialEnd = allDay
    ? exclusiveAllDayEnd
      ? addCalendarDays(exclusiveAllDayEnd, -1)
      : initialStart
    : event.end.dateTime
      ? new Date(event.end.dateTime)
      : null;

  const [start, setStart] = useState<Date | null>(initialStart);
  const [end, setEnd] = useState<Date | null>(initialEnd);

  function handleStartChange(nextStart: Date | null) {
    if (!nextStart) {
      setStart(null);
      return;
    }

    if (end) {
      if (allDay) {
        const nextStartDay = calendarDayNumber(nextStart);
        const endDay = calendarDayNumber(end);

        if (nextStartDay > endDay) {
          const currentSpanDays = start
            ? Math.max(0, calendarDayNumber(end) - calendarDayNumber(start))
            : 0;
          setEnd(addCalendarDays(nextStart, currentSpanDays));
        }
      } else if (nextStart.getTime() >= end.getTime()) {
        const currentDurationMs =
          start && end.getTime() > start.getTime()
            ? end.getTime() - start.getTime()
            : 60 * 60 * 1000;
        setEnd(new Date(nextStart.getTime() + currentDurationMs));
      }
    }

    setStart(nextStart);
  }

  async function submit(values: Values) {
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      const title = values.title.trim();
      const location = values.location.trim();
      const description = values.description.trim();

      if (!title) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Enter an event title",
        });
        return;
      }

      if (!values.start || !values.end) {
        await showToast({
          style: Toast.Style.Failure,
          title: allDay
            ? "Start and end dates are required"
            : "Start and end are required",
        });
        return;
      }

      if (allDay) {
        const startDate = formatDateOnly(values.start);
        const inclusiveEndDate = formatDateOnly(values.end);

        if (inclusiveEndDate < startDate) {
          await showToast({
            style: Toast.Style.Failure,
            title: "End date must be on or after start date",
          });
          return;
        }

        // Google Calendar stores all-day end dates exclusively. Raycast shows
        // the user an intuitive inclusive end date, then converts it back here.
        const exclusiveEndDate = formatDateOnly(addCalendarDays(values.end, 1));

        setSaving(true);
        await updateEvent(calendar.id, event.id, {
          summary: title,
          start: { date: startDate },
          end: { date: exclusiveEndDate },
          location,
          description,
        });
      } else {
        if (values.end.getTime() <= values.start.getTime()) {
          await showToast({
            style: Toast.Style.Failure,
            title: "End must be after start",
          });
          return;
        }

        setSaving(true);
        await updateEvent(calendar.id, event.id, {
          summary: title,
          start: { dateTime: values.start.toISOString() },
          end: { dateTime: values.end.toISOString() },
          location,
          description,
        });
      }

      await onSaved();
      await showToast({ style: Toast.Style.Success, title: "Event updated" });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not update event",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <Form
      isLoading={saving}
      navigationTitle={`Edit · ${calendarDisplayName(calendar)}`}
      actions={
        <ActionPanel>
          {/* Keep Save independent of the host's form-value collection. Some
              Raycast versions do not dispatch SubmitForm from this editor. */}
          <Action
            title="Save Event"
            icon={Icon.Checkmark}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={() =>
              submit({ title, start, end, location, description })
            }
          />
          {event.htmlLink ? (
            <Action.OpenInBrowser
              title="Open in Google Calendar"
              url={event.htmlLink}
            />
          ) : null}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        value={title}
        onChange={setTitle}
      />
      <Form.DatePicker
        id="start"
        title={allDay ? "Start Date" : "Start"}
        value={start}
        onChange={handleStartChange}
        type={
          allDay ? Form.DatePicker.Type.Date : Form.DatePicker.Type.DateTime
        }
      />
      <Form.DatePicker
        id="end"
        title={allDay ? "End Date" : "End"}
        value={end}
        onChange={setEnd}
        min={start || undefined}
        type={
          allDay ? Form.DatePicker.Type.Date : Form.DatePicker.Type.DateTime
        }
      />
      <Form.TextField
        id="location"
        title="Location"
        value={location}
        onChange={setLocation}
      />
      <Form.TextArea
        id="description"
        title="Description"
        value={description}
        onChange={setDescription}
      />
    </Form>
  );
}

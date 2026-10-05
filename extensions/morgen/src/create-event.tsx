import {
  ActionPanel,
  Action,
  Form,
  showHUD,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { createEvent, listCalendars, MorgenCalendar } from "./api";

const DURATION_OPTIONS = [
  { title: "15 minutes", value: "PT15M" },
  { title: "30 minutes", value: "PT30M" },
  { title: "45 minutes", value: "PT45M" },
  { title: "1 hour", value: "PT1H" },
  { title: "1.5 hours", value: "PT1H30M" },
  { title: "2 hours", value: "PT2H" },
  { title: "3 hours", value: "PT3H" },
  { title: "4 hours", value: "PT4H" },
];

interface FormValues {
  title: string;
  date: Date;
  startTime: string;
  duration: string;
  calendar: string;
}

export default function CreateEvent() {
  const [calendars, setCalendars] = useState<MorgenCalendar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    async function fetchCalendars() {
      try {
        const cals = await listCalendars();
        setCalendars(
          cals.filter(
            (c) => c.myRights?.mayWriteAll || c.myRights?.mayWriteOwn,
          ),
        );
      } catch (error) {
        setHasError(true);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load calendars",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchCalendars();
  }, []);

  async function handleSubmit(values: FormValues) {
    if (isLoading || hasError) return;
    if (!values.title.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Title is required",
      });
      return;
    }
    if (!values.calendar) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please select a calendar",
      });
      return;
    }

    const calendar = calendars.find(
      (c) => `${c.accountId}::${c.id}` === values.calendar,
    );
    if (!calendar) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid calendar selection",
      });
      return;
    }

    const date = values.date;
    const [hours, minutes] = values.startTime.split(":").map(Number);
    date.setHours(hours, minutes, 0, 0);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const h = String(date.getHours()).padStart(2, "0");
    const m = String(date.getMinutes()).padStart(2, "0");
    const startISO = `${year}-${month}-${day}T${h}:${m}:00`;

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Creating event...",
      });
      await createEvent({
        accountId: calendar.accountId,
        calendarId: calendar.id,
        title: values.title.trim(),
        start: startISO,
        duration: values.duration,
        timeZone,
        showWithoutTime: false,
      });
      await showHUD("Event created!");
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create event",
        message: String(error),
      });
    }
  }

  const now = new Date();
  const defaultTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Event"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      {hasError && (
        <Form.Description
          title="Unable to Load Calendars"
          text="Calendar choices are unavailable. Check the error and reopen this command later."
        />
      )}
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Meeting with team"
      />
      <Form.DatePicker id="date" title="Date" defaultValue={now} />
      <Form.TextField
        id="startTime"
        title="Start Time"
        placeholder="14:00"
        defaultValue={defaultTime}
      />
      <Form.Dropdown id="duration" title="Duration" defaultValue="PT1H">
        {DURATION_OPTIONS.map((opt) => (
          <Form.Dropdown.Item
            key={opt.value}
            title={opt.title}
            value={opt.value}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="calendar" title="Calendar">
        {calendars.map((cal) => (
          <Form.Dropdown.Item
            key={`${cal.accountId}::${cal.id}`}
            title={cal.name}
            value={`${cal.accountId}::${cal.id}`}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

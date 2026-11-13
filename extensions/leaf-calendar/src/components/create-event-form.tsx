import { Action, ActionPanel, Form, Icon, PopToRootType, showHUD, showToast, Toast } from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { useState } from "react";
import { leaf, showLeafError } from "../lib/leaf";
import {
  DAY_DURATIONS,
  durationToApi,
  formatDays,
  formatDuration,
  nextHalfHour,
  startOfDay,
  USUAL_DURATIONS,
} from "../lib/time";
import type { Person } from "../lib/types";
import GuestFields from "./guest-fields";

type Props = {
  initialDay?: Date;
  onCreated?: () => void;
};

type Values = {
  title: string;
  calendarId: string;
  allDay: boolean;
  start: Date | null;
  duration: string;
  location: string;
  meet: boolean;
  description: string;
  notifyGuests: boolean;
};

// Durations In Minutes (timed) And Days (all-day)
const MINUTES = USUAL_DURATIONS.map((minutes) => ({ value: String(minutes), title: formatDuration(minutes) }));
const DAYS = DAY_DURATIONS.map((days) => ({ value: String(days), title: formatDays(days) }));
const DEFAULT_MINUTES = "30";
const DEFAULT_DAYS = "1";

// The Next Half Hour Today, Or 9:00 AM On Another Day
function defaultStart(day?: Date): Date {
  const now = new Date();
  if (!day || startOfDay(day).getTime() === startOfDay(now).getTime()) {
    return nextHalfHour(now);
  }

  const start = startOfDay(day);
  start.setHours(9);
  return start;
}

/** A new event; on its own it stays open for the next one, pushed from the agenda it goes back and refreshes. */
export default function CreateEventForm({ initialDay, onCreated }: Props) {
  const [guests, setGuests] = useState<Person[]>([]);

  const { handleSubmit, itemProps, values, setValue, setValidationError } = useForm<Values>({
    initialValues: {
      title: "",
      calendarId: "",
      allDay: false,
      start: defaultStart(initialDay),
      duration: DEFAULT_MINUTES,
      location: "",
      meet: false,
      description: "",
      notifyGuests: true,
    },
    validation: {
      title: FormValidation.Required,
      start: (value) => (value ? undefined : "Pick a start"),
    },
    async onSubmit(form) {
      let span: { start: string; end: string };
      try {
        span = durationToApi(form.start!, Number(form.duration), form.allDay);
      } catch (error) {
        setValidationError("duration", (error as Error).message);
        return;
      }

      const emails = guests.map((guest) => guest.email);
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating event" });
      try {
        await leaf().call("events.create", {
          title: form.title.trim(),
          ...span,
          calendarId: form.calendarId || undefined,
          location: form.location.trim() || undefined,
          meet: form.meet || undefined,
          description: form.description.trim() || undefined,
          guests: emails.length ? emails : undefined,
          notifyGuests: emails.length ? form.notifyGuests : undefined,
        });

        // Done: Close Raycast And Start Fresh Next Time
        await toast.hide();
        onCreated?.();
        await showHUD(`Created ${form.title.trim()}`, { popToRootType: PopToRootType.Immediate });
      } catch (error) {
        await toast.hide();
        await showLeafError(error);
      }
    },
  });

  // Calendars You Can Add To; Leaf Calendar's Default Is Picked Until You Choose Another
  const { data: calendars, isLoading } = useCachedPromise(() => leaf().call("calendars.list"), [], {
    onError: showLeafError,
  });
  const editable = (calendars ?? []).filter((calendar) => calendar.canEdit);
  const defaultId = editable.find((calendar) => calendar.isDefault)?.id ?? editable[0]?.id ?? "";

  // All-Day Counts In Days, So Switching Resets The Duration
  function setAllDay(allDay: boolean) {
    setValue("allDay", allDay);
    setValue("duration", allDay ? DEFAULT_DAYS : DEFAULT_MINUTES);
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Create Event"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Event" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" placeholder="Coffee with Sam" {...itemProps.title} />
      {editable.length > 0 && (
        <Form.Dropdown
          id="calendarId"
          title="Calendar"
          value={values.calendarId || defaultId}
          onChange={(value) => setValue("calendarId", value)}
        >
          {editable.map((calendar) => (
            <Form.Dropdown.Item
              key={calendar.id}
              value={calendar.id}
              title={calendar.name === calendar.account ? calendar.name : `${calendar.name} (${calendar.account})`}
              icon={{ source: Icon.CircleFilled, tintColor: calendar.color }}
            />
          ))}
        </Form.Dropdown>
      )}
      <Form.Separator />
      <Form.Checkbox id="allDay" label="All-day event" value={values.allDay} onChange={setAllDay} />
      <Form.DatePicker
        title="Start"
        type={values.allDay ? Form.DatePicker.Type.Date : Form.DatePicker.Type.DateTime}
        {...itemProps.start}
      />
      <Form.Dropdown title="Duration" {...itemProps.duration}>
        {(values.allDay ? DAYS : MINUTES).map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextField title="Location" placeholder="Optional" {...itemProps.location} />
      <Form.Checkbox
        label="Add Google Meet"
        info="Google makes the Meet link once Leaf Calendar sends the event."
        {...itemProps.meet}
      />
      <Form.TextArea title="Description" placeholder="Optional" {...itemProps.description} />
      <Form.Separator />
      <GuestFields value={guests} onChange={setGuests} />
      {guests.length > 0 && <Form.Checkbox label="Email the invitations" {...itemProps.notifyGuests} />}
    </Form>
  );
}

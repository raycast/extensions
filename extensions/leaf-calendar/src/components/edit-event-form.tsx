import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { FormValidation, useForm, usePromise } from "@raycast/utils";
import { useState } from "react";
import { leaf, showLeafError } from "../lib/leaf";
import {
  DAY_DURATIONS,
  durationToApi,
  formatDays,
  formatDuration,
  parseLeafTime,
  spanFromApi,
  startOfDay,
  USUAL_DURATIONS,
  withCurrent,
} from "../lib/time";
import type { Calendar, LeafEvent, LeafEventDetail, MoveScope, Person } from "../lib/types";
import GuestFields from "./guest-fields";

type Props = {
  event: LeafEvent;
  onSaved: () => void;
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
  scope: string;
  notifyGuests: boolean;
};

const isMeet = (link: string | null) => !!link && link.startsWith("https://meet.google.com/");
const sameEmails = (a: Person[], b: Person[]) =>
  a.length === b.length && a.every((guest, i) => guest.email.toLowerCase() === b[i].email.toLowerCase());

/** Changes any part of an event, like saving it in Leaf Calendar's editor. Loads the whole event first. */
export default function EditEventForm({ event, onSaved }: Props) {
  const detail = usePromise((id: string) => leaf().call("events.get", { id }), [event.id], { onError: showLeafError });
  const calendars = usePromise(() => leaf().call("calendars.list"), [], { onError: showLeafError });

  if (!detail.data || !calendars.data) {
    return <Form isLoading navigationTitle={`Edit ${event.title || "Event"}`} />;
  }

  return <EditFields detail={detail.data} calendars={calendars.data} onSaved={onSaved} />;
}

function EditFields({
  detail,
  calendars,
  onSaved,
}: {
  detail: LeafEventDetail;
  calendars: Calendar[];
  onSaved: () => void;
}) {
  // The Event As It Is Now
  const span = spanFromApi(detail);
  const length = detail.allDay
    ? Math.round((startOfDay(span.end).getTime() - startOfDay(span.start).getTime()) / 86_400_000) + 1
    : Math.round((parseLeafTime(detail.end).getTime() - parseLeafTime(detail.start).getTime()) / 60_000);
  const original: Person[] = detail.guests.map((g) => ({ name: g.name, email: g.email }));
  const editable = calendars.filter((calendar) => calendar.canEdit || calendar.id === detail.calendarId);

  const [guests, setGuests] = useState<Person[]>(original);

  const { handleSubmit, itemProps, values, setValue, setValidationError } = useForm<Values>({
    initialValues: {
      title: detail.title,
      calendarId: detail.calendarId,
      allDay: detail.allDay,
      start: span.start,
      duration: String(length),
      location: detail.location ?? "",
      meet: isMeet(detail.meetingLink),
      description: detail.description,
      scope: "this",
      notifyGuests: true,
    },
    validation: {
      title: FormValidation.Required,
      start: (value) => (value ? undefined : "Pick a start"),
    },
    async onSubmit(form) {
      let times: { start: string; end: string };
      try {
        times = durationToApi(form.start!, Number(form.duration), form.allDay);
      } catch (error) {
        setValidationError("duration", (error as Error).message);
        return;
      }

      // Only What Changed Is Sent
      const before = durationToApi(span.start, length, detail.allDay);
      const changes = {
        title: form.title.trim() !== detail.title ? form.title.trim() : undefined,
        calendarId: form.calendarId !== detail.calendarId ? form.calendarId : undefined,
        ...(times.start !== before.start || times.end !== before.end ? times : {}),
        location: form.location.trim() !== (detail.location ?? "") ? form.location.trim() : undefined,
        description: form.description.trim() !== detail.description.trim() ? form.description.trim() : undefined,
        guests: sameEmails(guests, original) ? undefined : guests.map((guest) => guest.email),
        meet: form.meet !== isMeet(detail.meetingLink) ? form.meet : undefined,
      };
      if (Object.values(changes).every((value) => value === undefined)) {
        await showToast({ style: Toast.Style.Success, title: "Nothing to save" });
        return;
      }

      const toast = await showToast({ style: Toast.Style.Animated, title: "Saving event" });
      try {
        await leaf().call("events.update", {
          id: detail.id,
          ...changes,
          scope: form.scope as MoveScope,
          notifyGuests: guests.length || original.length ? form.notifyGuests : undefined,
        });
        toast.style = Toast.Style.Success;
        toast.title = "Saved event";
        onSaved();
        await popToRoot();
      } catch (error) {
        await toast.hide();
        await showLeafError(error);
      }
    },
  });

  // All-Day Counts In Days, So Switching Resets The Duration
  function setAllDay(allDay: boolean) {
    setValue("allDay", allDay);
    setValue("duration", allDay ? "1" : "30");
  }

  const lengths = values.allDay
    ? withCurrent(DAY_DURATIONS, detail.allDay ? length : 1)
    : withCurrent(USUAL_DURATIONS, detail.allDay ? 30 : length);

  return (
    <Form
      navigationTitle={`Edit ${detail.title || "Event"}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Event" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" {...itemProps.title} />
      <Form.Dropdown title="Calendar" {...itemProps.calendarId}>
        {editable.map((calendar) => (
          <Form.Dropdown.Item
            key={calendar.id}
            value={calendar.id}
            title={calendar.name === calendar.account ? calendar.name : `${calendar.name} (${calendar.account})`}
            icon={{ source: Icon.CircleFilled, tintColor: calendar.color }}
          />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.Checkbox id="allDay" label="All-day event" value={values.allDay} onChange={setAllDay} />
      <Form.DatePicker
        title="Start"
        type={values.allDay ? Form.DatePicker.Type.Date : Form.DatePicker.Type.DateTime}
        {...itemProps.start}
      />
      <Form.Dropdown title="Duration" {...itemProps.duration}>
        {lengths.map((value) => (
          <Form.Dropdown.Item
            key={value}
            value={String(value)}
            title={values.allDay ? formatDays(value) : formatDuration(value)}
          />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextField title="Location" placeholder="Optional" {...itemProps.location} />
      <Form.Checkbox
        label="Google Meet"
        info="Adds a Google Meet link, or removes the one the event has."
        {...itemProps.meet}
      />
      <Form.TextArea title="Description" placeholder="Optional" {...itemProps.description} />
      <Form.Separator />
      <GuestFields value={guests} onChange={setGuests} />
      {(guests.length > 0 || original.length > 0) && (
        <Form.Checkbox label="Email the guests about changes" {...itemProps.notifyGuests} />
      )}
      <Form.Dropdown title="Repeats" info="Only matters for a repeating event." {...itemProps.scope}>
        <Form.Dropdown.Item value="this" title="This event" />
        <Form.Dropdown.Item value="following" title="This and following events" />
        <Form.Dropdown.Item value="all" title="All events" />
      </Form.Dropdown>
    </Form>
  );
}

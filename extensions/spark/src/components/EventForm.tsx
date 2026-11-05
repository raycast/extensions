import { Action, ActionPanel, Form, popToRoot, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { cliDate } from "../lib/args";
import { createEvent } from "../lib/calendar";
import { sparkJSON } from "../lib/spark";
import { AccountsResult } from "../lib/types";
import { actionIcon } from "../lib/sparkIcons";
import { RecipientField, RecipientTags, useFrequentContacts } from "./Recipients";
import { useSparkErrorHandler } from "./SparkSetup";

interface Props {
  start?: Date;
  end?: Date;
  attendees?: string[];
}

interface Values {
  title: string;
  start: Date | null;
  end: Date | null;
  calendar: string;
  attendees: string[];
  videoConference: string;
  location: string;
  description: string;
}

export default function EventForm({ start, end, attendees }: Props) {
  const [attendeeList, setAttendees] = useState(attendees ?? []);
  const people = useFrequentContacts();
  const field: RecipientField = { id: "attendees", title: "Attendees", value: attendeeList, onChange: setAttendees };
  // Creating an event needs Send access on the calendar's account.
  const onError = useSparkErrorHandler("Couldn't load your calendars");
  const { data: calendars = [], isLoading } = useCachedPromise(
    async () =>
      (await sparkJSON<AccountsResult>(["accounts"])).accounts
        .filter((a) => a.access === "send")
        .flatMap((a) =>
          a.calendars
            .filter((c) => c.access === "read-write")
            .map((c) => ({ id: c.identifier, title: `${c.title} — ${a.email}` })),
        ),
    [],
    { onError },
  );

  async function submit(values: Values) {
    if (!values.title.trim() || !values.start) {
      await showToast({ style: Toast.Style.Failure, title: "Add a title and a start time" });
      return;
    }
    const ok = await createEvent({
      title: values.title.trim(),
      start: cliDate(values.start),
      end: values.end ? cliDate(values.end) : undefined,
      calendar: values.calendar || undefined,
      location: values.location.trim() || undefined,
      description: values.description.trim() || undefined,
      videoConference: values.videoConference ? (values.videoConference as "auto") : undefined,
      attendees: attendeeList,
    });
    if (ok) await popToRoot();
  }

  return (
    <Form
      navigationTitle="New Event"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Event" icon={actionIcon("AddNewEvent")} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Creating events needs Send access on the calendar's account. Attendees get invitations right away." />
      <Form.TextField id="title" title="Title" placeholder="Sync" />
      <Form.DatePicker id="start" title="Start" defaultValue={start} type={Form.DatePicker.Type.DateTime} />
      <Form.DatePicker id="end" title="End" defaultValue={end} type={Form.DatePicker.Type.DateTime} />
      <Form.Dropdown id="calendar" title="Calendar" storeValue>
        <Form.Dropdown.Item value="" title="Default calendar" />
        {calendars.map((c) => (
          <Form.Dropdown.Item key={c.id} value={c.id} title={c.title} />
        ))}
      </Form.Dropdown>
      <RecipientTags field={field} people={people} />
      <Form.Dropdown id="videoConference" title="Video Call" storeValue>
        <Form.Dropdown.Item value="" title="None" />
        <Form.Dropdown.Item value="auto" title="Account default" />
        <Form.Dropdown.Item value="meet" title="Google Meet" />
        <Form.Dropdown.Item value="zoom" title="Zoom" />
        <Form.Dropdown.Item value="teams" title="Microsoft Teams" />
      </Form.Dropdown>
      <Form.TextField id="location" title="Location" />
      <Form.TextArea id="description" title="Notes" />
    </Form>
  );
}

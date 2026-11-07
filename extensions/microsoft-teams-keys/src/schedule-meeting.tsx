import { Action, ActionPanel, Form, Icon, closeMainWindow, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { resolvePerson } from "./lib/contacts";
import { openInTeams } from "./lib/teams";

interface Values {
  subject: string;
  attendees: string;
  start: Date | null;
  duration: string;
  content: string;
}

/** The next full or half hour, the time most meetings start. */
function nextSlot(): Date {
  const date = new Date();
  date.setSeconds(0, 0);
  date.setMinutes(date.getMinutes() < 30 ? 30 : 60);
  return date;
}

/** ISO 8601 with the local offset, which is what the Teams link expects. */
function isoWithOffset(date: Date): string {
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:00${sign}${pad(offset / 60)}:${pad(offset % 60)}`
  );
}

export default function Command() {
  const [attendeeError, setAttendeeError] = useState<string | undefined>();

  async function submit(values: Values) {
    const names = values.attendees
      .split(/[,;]/)
      .map((name) => name.trim())
      .filter(Boolean);
    const emails: string[] = [];
    for (const name of names) {
      const target = await resolvePerson(name);
      if (target.kind !== "email") {
        setAttendeeError(`"${name}" is neither an email address nor a saved contact`);
        return;
      }
      emails.push(target.email);
    }

    const params = new URLSearchParams();
    if (values.subject.trim()) params.set("subject", values.subject.trim());
    if (emails.length > 0) params.set("attendees", emails.join(","));
    if (values.start) {
      const end = new Date(values.start.getTime() + Number(values.duration) * 60_000);
      params.set("startTime", isoWithOffset(values.start));
      params.set("endTime", isoWithOffset(end));
    }
    if (values.content.trim()) params.set("content", values.content.trim());
    // Teams wants %20 for spaces, URLSearchParams writes "+".
    const query = params.toString().replace(/\+/g, "%20");

    await closeMainWindow();
    try {
      await openInTeams(`https://teams.microsoft.com/l/meeting/new?${query}`);
      await showHUD("Check the meeting in Teams, then press Send");
    } catch (error) {
      await showFailureToast(error, { title: "Could not open the meeting form" });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Open in Teams" icon={Icon.Calendar} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Fills in the new meeting form in Teams. Nothing is sent until you press Send there." />
      <Form.TextField id="subject" title="Subject" placeholder="Weekly sync" />
      <Form.TextField
        id="attendees"
        title="Attendees"
        placeholder="anna@example.com, Ben"
        info="Email addresses or saved contacts, separated by commas."
        error={attendeeError}
        onChange={() => setAttendeeError(undefined)}
      />
      <Form.DatePicker id="start" title="Start" defaultValue={nextSlot()} />
      <Form.Dropdown id="duration" title="Duration" defaultValue="30">
        <Form.Dropdown.Item value="15" title="15 Minutes" />
        <Form.Dropdown.Item value="30" title="30 Minutes" />
        <Form.Dropdown.Item value="45" title="45 Minutes" />
        <Form.Dropdown.Item value="60" title="1 Hour" />
        <Form.Dropdown.Item value="90" title="1.5 Hours" />
        <Form.Dropdown.Item value="120" title="2 Hours" />
      </Form.Dropdown>
      <Form.TextArea id="content" title="Description" placeholder="Agenda, notes …" />
    </Form>
  );
}

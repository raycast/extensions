import {
  Action,
  ActionPanel,
  Form,
  Icon,
  LaunchProps,
  getPreferenceValues,
  open,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { useState } from "react";
import { MEETINGS, MeetingId, getMeeting, isMeetingId } from "./data/meetings";
import {
  CalendarEvent,
  RECURRENCE_LABELS,
  Recurrence,
  googleCalendarUrl,
  localTimeZone,
  outlookCalendarUrl,
  validateEvent,
} from "./lib/calendar";
import { buildIcs, icsFileName } from "./lib/ics";
import { meetingUrl, resolveMeetingId } from "./lib/urls";

type Provider = "google" | "outlook" | "ics";

type Values = {
  meeting: string;
  title: string;
  start: Date | null;
  duration: string;
  repeat: string;
  includeJoinLink: boolean;
  isPrivate: boolean;
  provider: string;
};

const PROVIDER_LABELS: Record<Provider, string> = {
  google: "Open in Google Calendar",
  outlook: "Open in Outlook",
  ics: "Download Calendar Invite (.ics)",
};
const PROVIDERS = Object.keys(PROVIDER_LABELS) as Provider[];
const DURATIONS = [15, 30, 45, 60, 90, 120];

function nextHalfHour(): Date {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60);
  return d;
}

function toEvent(v: Values): CalendarEvent | undefined {
  if (!isMeetingId(v.meeting) || !v.start) return undefined;
  const minutes = Number(v.duration);
  if (!(minutes > 0)) return undefined;
  return {
    meetingId: v.meeting,
    title: v.title,
    start: v.start,
    end: new Date(v.start.getTime() + minutes * 60_000),
    timeZone: localTimeZone(),
    includeJoinLink: v.includeJoinLink,
    isPrivate: v.isPrivate,
    recurrence: v.repeat as Recurrence,
  };
}

async function saveIcs(event: CalendarEvent): Promise<string> {
  const dir = join(homedir(), "Downloads");
  await mkdir(dir, { recursive: true });
  const path = join(dir, icsFileName(event));
  await writeFile(path, buildIcs(event), "utf8");
  await open(path);
  return path;
}

async function exportEvent(provider: Provider, values: Values): Promise<void> {
  const event = toEvent(values);
  const error = event ? validateEvent(event) : "Fill in all required fields";
  if (!event || error) {
    await showToast({ style: Toast.Style.Failure, title: "Can't create event", message: error });
    return;
  }

  try {
    if (provider === "outlook" && event.recurrence !== "none") {
      // Outlook compose links cannot carry a recurrence rule.
      await saveIcs(event);
      await showToast({
        style: Toast.Style.Success,
        title: "Saved .ics instead",
        message: "Outlook links can't repeat events. Open the file in Outlook to import it.",
      });
      return;
    }
    if (provider === "ics") {
      const path = await saveIcs(event);
      await showToast({ style: Toast.Style.Success, title: "Calendar invite saved", message: path });
      return;
    }
    await open(provider === "google" ? googleCalendarUrl(event) : outlookCalendarUrl(event));
    await showToast({
      style: Toast.Style.Success,
      title: provider === "google" ? "Opened Google Calendar" : "Opened Outlook",
      message: event.isPrivate
        ? "This link can't set Private; adjust visibility in the event. Busy is requested where supported."
        : undefined,
    });
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't export event",
      message: e instanceof Error ? e.message : String(e),
    });
  }
}

export function BlockCalendarForm({ meetingId }: { meetingId?: MeetingId }) {
  const prefs = getPreferenceValues<Preferences>();
  const initialMeeting = meetingId ?? resolveMeetingId(prefs.preferredMeeting);

  const [meeting, setMeeting] = useState<string>(initialMeeting);
  const [title, setTitle] = useState(getMeeting(initialMeeting).title);
  const [titleTouched, setTitleTouched] = useState(false);
  const [start, setStart] = useState<Date | null>(nextHalfHour);
  const [duration, setDuration] = useState<string>(
    DURATIONS.includes(Number(prefs.defaultDuration)) ? prefs.defaultDuration : "30",
  );
  const [repeat, setRepeat] = useState<string>("none");
  const [includeJoinLink, setIncludeJoinLink] = useState(prefs.includeJoinLink ?? true);
  const [isPrivate, setIsPrivate] = useState(prefs.defaultPrivate ?? true);
  const [provider, setProvider] = useState<string>(prefs.preferredCalendar ?? "google");
  const [titleError, setTitleError] = useState<string>();

  const current: Provider = PROVIDERS.includes(provider as Provider) ? (provider as Provider) : "google";
  const ordered = [current, ...PROVIDERS.filter((p) => p !== current)];
  const safeMeeting = resolveMeetingId(meeting);

  return (
    <Form
      actions={
        <ActionPanel>
          {ordered.map((p) => (
            <Action.SubmitForm
              key={p}
              title={PROVIDER_LABELS[p]}
              icon={p === "ics" ? Icon.Download : Icon.Calendar}
              onSubmit={(v: Values) => {
                if (!v.title.trim()) {
                  setTitleError("Event title is required");
                  return;
                }
                return exportEvent(p, v);
              }}
            />
          ))}
          <Action.CopyToClipboard
            title="Copy Meeting Link"
            content={meetingUrl(safeMeeting)}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="meeting"
        title="Meeting"
        value={meeting}
        onChange={(id) => {
          setMeeting(id);
          if (!titleTouched && isMeetingId(id)) setTitle(getMeeting(id).title);
        }}
      >
        {MEETINGS.map((m) => (
          <Form.Dropdown.Item key={m.id} value={m.id} title={m.title} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="title"
        title="Event Title"
        value={title}
        error={titleError}
        onChange={(v) => {
          setTitle(v);
          setTitleTouched(true);
          setTitleError(v.trim() ? undefined : "Event title is required");
        }}
      />
      <Form.DatePicker
        id="start"
        title="Start"
        type={Form.DatePicker.Type.DateTime}
        value={start}
        onChange={setStart}
      />
      <Form.Dropdown id="duration" title="Duration" value={duration} onChange={setDuration}>
        {DURATIONS.map((m) => (
          <Form.Dropdown.Item key={m} value={String(m)} title={`${m} minutes`} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="repeat" title="Repeat" value={repeat} onChange={setRepeat}>
        {(Object.keys(RECURRENCE_LABELS) as Recurrence[]).map((r) => (
          <Form.Dropdown.Item key={r} value={r} title={RECURRENCE_LABELS[r]} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox
        id="includeJoinLink"
        label="Include Join Link"
        value={includeJoinLink}
        onChange={setIncludeJoinLink}
      />
      <Form.Checkbox id="isPrivate" label="Private Event" value={isPrivate} onChange={setIsPrivate} />
      <Form.Dropdown id="provider" title="Calendar" value={provider} onChange={setProvider}>
        <Form.Dropdown.Item value="google" title="Google Calendar" />
        <Form.Dropdown.Item value="outlook" title="Outlook" />
        <Form.Dropdown.Item value="ics" title="Calendar File (.ics)" />
      </Form.Dropdown>
      <Form.Description
        text={
          repeat !== "none" && provider === "outlook"
            ? "Outlook links can't repeat events, so a .ics file will be saved instead."
            : "Final visibility and availability depend on your calendar provider and sharing settings. Meetings are fictional."
        }
      />
    </Form>
  );
}

export default function Command(props: LaunchProps<{ launchContext: { meetingId?: string } }>) {
  const id = props.launchContext?.meetingId;
  return <BlockCalendarForm meetingId={isMeetingId(id) ? id : undefined} />;
}

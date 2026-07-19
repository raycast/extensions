import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  openExtensionPreferences,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { applyStatus, SERVICE_LABELS, ServiceKey } from "./lib/api";
import { canUseAI, generateMeetingStatuses, Suggestion } from "./lib/ai";
import { getCurrentOrNextMeeting, Meeting } from "./lib/calendar";
import { DURATION_OPTIONS, DurationKey } from "./lib/duration";
import { charFor } from "./lib/emoji";
import { defaultServices, getPrefs, Prefs } from "./lib/preferences";
import { addRecent } from "./lib/storage";
import { getTone } from "./lib/tone";

export default function Command() {
  const prefs = getPrefs();
  if (!prefs.calendarIcsUrl) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Calendar}
          title="No calendar connected"
          description="Add your Google Calendar secret iCal URL in preferences to use Meeting Status."
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }
  return <MeetingStatusForm prefs={prefs} />;
}

function MeetingStatusForm({ prefs }: { prefs: Prefs }) {
  const [services, setServices] = useState<string[]>(defaultServices(prefs));
  const [duration, setDuration] = useState<string>("default");
  const [emoji, setEmoji] = useState("");
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [index, setIndex] = useState(0);
  const [generating, setGenerating] = useState(false);

  const {
    data: meeting,
    isLoading: loadingMeeting,
    error,
  } = usePromise(() => getCurrentOrNextMeeting(prefs.calendarIcsUrl as string));

  function apply(s: Suggestion) {
    setEmoji(s.emoji);
    setText(s.text);
  }

  async function regenerate(m: Meeting) {
    if (!canUseAI()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Raycast Pro required for AI",
      });
      return;
    }
    setGenerating(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Generating from meeting…",
    });
    try {
      const tone = await getTone();
      const results = await generateMeetingStatuses(m.title, m.agenda, tone);
      setSuggestions(results);
      setIndex(0);
      apply(results[0]);
      toast.style = Toast.Style.Success;
      toast.title = `${results.length} suggestions — ⌘R to shuffle`;
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "AI failed";
      toast.message = e instanceof Error ? e.message : String(e);
    } finally {
      setGenerating(false);
    }
  }

  // Generate once, as soon as the meeting is loaded.
  useEffect(() => {
    if (meeting && suggestions.length === 0 && canUseAI()) {
      void regenerate(meeting);
    }
  }, [meeting]);

  function shuffle() {
    if (suggestions.length === 0) return;
    const next = (index + 1) % suggestions.length;
    setIndex(next);
    apply(suggestions[next]);
  }

  async function submit() {
    if (services.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Pick at least one service",
      });
      return;
    }
    if (!text.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "No status yet" });
      return;
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Setting status…",
    });
    const results = await applyStatus(
      services as ServiceKey[],
      emoji.trim() || ":speech_balloon:",
      text.trim(),
      prefs,
      duration === "default" ? undefined : (duration as DurationKey),
    );
    const ok = results
      .filter((r) => r.ok)
      .map((r) => SERVICE_LABELS[r.service]);
    const failed = results.filter((r) => !r.ok);
    if (ok.length > 0) {
      const chosen = emoji.trim() || ":speech_balloon:";
      await addRecent({
        emoji: chosen,
        text: text.trim(),
        gitlab_emoji: charFor(chosen),
      });
    }
    if (failed.length === 0) {
      toast.style = Toast.Style.Success;
      toast.title = `Status set on ${ok.join(", ")}`;
      await popToRoot();
    } else if (ok.length === 0) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = failed
        .map((f) => `${SERVICE_LABELS[f.service]}: ${f.error}`)
        .join("\n");
    } else {
      toast.style = Toast.Style.Success;
      toast.title = `Set on ${ok.join(", ")}`;
      toast.message = `Failed: ${failed.map((f) => `${SERVICE_LABELS[f.service]} (${f.error})`).join(", ")}`;
    }
  }

  const meetingLabel = meeting
    ? `${meeting.ongoing ? "Now" : timeUntil(meeting.start)} · ${meeting.title}`
    : error
      ? `Couldn't read calendar: ${error.message}`
      : "No meeting in the next 24h";

  return (
    <Form
      isLoading={loadingMeeting || generating}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Set Status"
            icon={Icon.Check}
            onSubmit={submit}
          />
          {suggestions.length > 0 && (
            <Action
              title="Shuffle Suggestion"
              icon={Icon.Shuffle}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={shuffle}
            />
          )}
          {meeting && (
            <Action
              title="Regenerate"
              icon={Icon.Stars}
              shortcut={{ modifiers: ["cmd"], key: "g" }}
              onAction={() => regenerate(meeting)}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Description title="Meeting" text={meetingLabel} />
      <Form.TagPicker
        id="services"
        title="Services"
        value={services}
        onChange={setServices}
      >
        {(Object.keys(SERVICE_LABELS) as ServiceKey[]).map((key) => (
          <Form.TagPicker.Item
            key={key}
            value={key}
            title={SERVICE_LABELS[key]}
          />
        ))}
      </Form.TagPicker>
      <Form.Dropdown
        id="duration"
        title="Duration"
        value={duration}
        onChange={setDuration}
        info="How long the status stays. GitLab is mapped to its nearest supported bucket."
      >
        <Form.Dropdown.Item
          value="default"
          title="Default (from preferences)"
        />
        {DURATION_OPTIONS.map((o) => (
          <Form.Dropdown.Item key={o.key} value={o.key} title={o.title} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      {suggestions.length > 0 && (
        <Form.Description
          title="Suggestion"
          text={`${index + 1} / ${suggestions.length}  ·  ⌘R to shuffle, ⌘G to regenerate`}
        />
      )}
      <Form.TextField
        id="emoji"
        title="Emoji"
        placeholder=":fire:"
        value={emoji}
        onChange={setEmoji}
      />
      <Form.TextField
        id="text"
        title="Status"
        placeholder={
          meeting ? "Regenerate with ⌘G" : "No meeting to base a status on"
        }
        value={text}
        onChange={setText}
      />
    </Form>
  );
}

function timeUntil(start: Date): string {
  const mins = Math.round((start.getTime() - Date.now()) / 60_000);
  if (mins <= 0) return "Soon";
  if (mins < 60) return `in ${mins} min`;
  const hours = Math.round(mins / 60);
  return `in ${hours}h`;
}

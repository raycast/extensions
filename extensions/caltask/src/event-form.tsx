import { Form, ActionPanel, Action, Icon, showToast, Toast, AI, environment } from "@raycast/api";
import { useState, useEffect } from "react";
import { EventFormData, CalendarInfo } from "./types";
import {
  getPreferredAIModel,
  getDefaultEventDurationMs,
  getVisibleCalendars,
  resolveDefaultCalendarId,
} from "./preferences";

interface EventFormProps {
  initialData?: Partial<EventFormData>;
  onSubmit: (data: EventFormData) => Promise<void>;
  submitTitle?: string;
}

const ALARM_OPTIONS: { title: string; value: string }[] = [
  { title: "None", value: "none" },
  { title: "At time of event", value: "0" },
  { title: "5 minutes before", value: "-300" },
  { title: "15 minutes before", value: "-900" },
  { title: "30 minutes before", value: "-1800" },
  { title: "1 hour before", value: "-3600" },
  { title: "2 hours before", value: "-7200" },
  { title: "1 day before", value: "-86400" },
];

const RECURRENCE_OPTIONS: {
  title: string;
  value: EventFormData["recurrenceRule"];
}[] = [
  { title: "None", value: "none" },
  { title: "Daily", value: "daily" },
  { title: "Weekly", value: "weekly" },
  { title: "Monthly", value: "monthly" },
  { title: "Yearly", value: "yearly" },
];

/**
 * Group calendars by accountName for the dropdown.
 */
function groupCalendarsByAccount(calendars: CalendarInfo[]): Map<string, CalendarInfo[]> {
  const groups = new Map<string, CalendarInfo[]>();
  for (const cal of calendars) {
    const account = cal.accountName || "Other";
    const list = groups.get(account) || [];
    list.push(cal);
    groups.set(account, list);
  }
  return groups;
}

export default function EventForm({ initialData, onSubmit, submitTitle = "Create Event" }: EventFormProps) {
  const canUseAI = environment.canAccess(AI);
  const isEditing = !!initialData;

  const [calendars, setCalendars] = useState<CalendarInfo[]>([]);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(true);

  // Form field state
  const [quickAddText, setQuickAddText] = useState("");
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [calendarId, setCalendarId] = useState(initialData?.calendarId ?? "");
  const [startDate, setStartDate] = useState<Date | null>(initialData?.startDate ?? null);
  const [endDate, setEndDate] = useState<Date | null>(initialData?.endDate ?? null);
  const [isAllDay, setIsAllDay] = useState(initialData?.isAllDay ?? false);
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [urlValue, setUrlValue] = useState(initialData?.url ?? "");
  const [location, setLocation] = useState(initialData?.location ?? "");
  const [recurrenceRule, setRecurrenceRule] = useState<EventFormData["recurrenceRule"]>(
    initialData?.recurrenceRule ?? "none",
  );
  const [alarmOffset, setAlarmOffset] = useState("none");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load calendars on mount
  useEffect(() => {
    (async () => {
      try {
        const cals = await getVisibleCalendars();
        setCalendars(cals);
        // Set default calendar if none selected
        if (!calendarId && cals.length > 0) {
          const defaultCalId = await resolveDefaultCalendarId(cals);
          if (defaultCalId) setCalendarId(defaultCalId);
        }
      } catch (error) {
        console.error("Failed to load calendars:", error);
      } finally {
        setIsLoadingCalendars(false);
      }
    })();
  }, []);

  // Initialize alarm offset from initialData
  useEffect(() => {
    if (initialData?.alarmOffset !== undefined) {
      setAlarmOffset(String(initialData.alarmOffset));
    }
  }, []);

  const calendarGroups = groupCalendarsByAccount(calendars);

  async function handleQuickAdd() {
    if (!quickAddText.trim() || !canUseAI) return;

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Parsing with AI...",
      });

      const calendarNames = calendars.map((c) => c.name);
      const prompt = [
        "Parse this into a calendar event.",
        `Available calendars: ${JSON.stringify(calendarNames)}.`,
        "Return ONLY valid JSON with fields:",
        "title (string),",
        "startDate (ISO string),",
        "endDate (ISO string),",
        "location (string or null),",
        "isAllDay (boolean),",
        "notes (string or null),",
        "url (string or null),",
        "calendarName (string or null),",
        'recurrenceRule ("none"|"daily"|"weekly"|"monthly"|"yearly").',
        'alarm ("none"|"0"|"-300"|"-900"|"-1800"|"-3600"|"-7200"|"-86400" where -300=5min before, -900=15min, -1800=30min, -3600=1hr, -7200=2hr, -86400=1day before, 0=at time of event).',
        "Match calendar name from available list if mentioned.",
        "If no calendar mentioned, set calendarName to null.",
        'If no recurrence mentioned, use "none".',
        'If no alarm/reminder mentioned, use "none".',
        `Today is ${new Date().toISOString()}.`,
        `Input: "${quickAddText}"`,
      ].join(" ");

      const response = await AI.ask(prompt, {
        model: getPreferredAIModel(),
        creativity: "none",
      });

      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = response.trim();
      const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
      }

      const parsed = JSON.parse(jsonStr);

      if (parsed.title) setTitle(parsed.title);
      if (parsed.startDate) {
        setStartDate(new Date(parsed.startDate));
      }
      if (parsed.endDate) {
        setEndDate(new Date(parsed.endDate));
      }
      if (parsed.location !== undefined) {
        setLocation(parsed.location || "");
      }
      if (parsed.isAllDay !== undefined) {
        setIsAllDay(parsed.isAllDay);
      }
      if (parsed.notes) {
        setNotes(parsed.notes);
      }
      if (parsed.url) {
        setUrlValue(parsed.url);
      }
      if (parsed.calendarName) {
        const matched = calendars.find((c) => c.name.toLowerCase() === parsed.calendarName.toLowerCase());
        if (matched) {
          setCalendarId(matched.id);
        }
      }
      if (parsed.recurrenceRule && parsed.recurrenceRule !== "none") {
        setRecurrenceRule(parsed.recurrenceRule);
      }
      if (parsed.alarm && parsed.alarm !== "none") {
        setAlarmOffset(String(parsed.alarm));
      }

      setQuickAddText("");

      await showToast({
        style: Toast.Style.Success,
        title: "Fields updated from AI",
      });
    } catch (error) {
      console.error("Quick Add AI parsing failed:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "AI Parsing Failed",
        message: "Please fill in the fields manually",
      });
    }
  }

  async function handleSubmit() {
    // Validate required fields
    if (!title.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Title is required",
      });
      return;
    }
    if (!calendarId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please select a calendar",
      });
      return;
    }

    const effectiveStart = startDate ?? new Date();
    const effectiveEnd = endDate ?? new Date(effectiveStart.getTime() + getDefaultEventDurationMs());

    if (!isAllDay && effectiveEnd <= effectiveStart) {
      await showToast({
        style: Toast.Style.Failure,
        title: "End date must be after start date",
      });
      return;
    }
    // For all-day events, ensure end is at least same day
    if (isAllDay && effectiveEnd < effectiveStart) {
      await showToast({
        style: Toast.Style.Failure,
        title: "End date must not be before start date",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData: EventFormData = {
        title: title.trim(),
        calendarId,
        startDate: effectiveStart,
        endDate: effectiveEnd,
        isAllDay,
        notes: notes.trim() || undefined,
        url: urlValue.trim() || undefined,
        location: location.trim() || undefined,
        recurrenceRule,
        alarmOffset: alarmOffset === "none" ? undefined : Number(alarmOffset),
      };
      await onSubmit(formData);
    } catch (error) {
      console.error("Form submission failed:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save event",
        message: String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isLoadingCalendars || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitTitle} onSubmit={handleSubmit} />
          {canUseAI && !isEditing && (
            <Action
              title="Parse with AI"
              icon={Icon.Wand}
              onAction={handleQuickAdd}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            />
          )}
        </ActionPanel>
      }
    >
      {canUseAI && !isEditing && (
        <Form.TextField
          id="quickAdd"
          title="Quick Add"
          placeholder='e.g. "Lunch with Alice tomorrow at noon"'
          value={quickAddText}
          onChange={setQuickAddText}
          info="Type a natural description and press ⌘⇧P to auto-fill using AI"
        />
      )}

      {canUseAI && !isEditing && <Form.Separator />}

      <Form.TextField id="title" title="Title" placeholder="Event title" value={title} onChange={setTitle} />

      <Form.Dropdown id="calendarId" title="Calendar" value={calendarId} onChange={setCalendarId}>
        {Array.from(calendarGroups.entries()).map(([account, cals]) => (
          <Form.Dropdown.Section title={account} key={account}>
            {cals.map((cal) => (
              <Form.Dropdown.Item
                key={cal.id}
                value={cal.id}
                title={cal.name}
                icon={{
                  source: Icon.Dot,
                  tintColor: cal.color || undefined,
                }}
              />
            ))}
          </Form.Dropdown.Section>
        ))}
      </Form.Dropdown>

      <Form.DatePicker
        id="startDate"
        title="Start"
        value={startDate}
        onChange={setStartDate}
        type={isAllDay ? Form.DatePicker.Type.Date : Form.DatePicker.Type.DateTime}
      />

      <Form.DatePicker
        id="endDate"
        title="End"
        value={endDate}
        onChange={setEndDate}
        type={isAllDay ? Form.DatePicker.Type.Date : Form.DatePicker.Type.DateTime}
      />

      <Form.Checkbox id="isAllDay" title="All Day" label="All-day event" value={isAllDay} onChange={setIsAllDay} />

      <Form.Separator />

      <Form.Dropdown
        id="recurrenceRule"
        title="Repeat"
        value={recurrenceRule}
        onChange={(val) => setRecurrenceRule(val as EventFormData["recurrenceRule"])}
      >
        {RECURRENCE_OPTIONS.map((opt) => (
          <Form.Dropdown.Item key={opt.value} value={opt.value} title={opt.title} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="alarmOffset" title="Alarm" value={alarmOffset} onChange={setAlarmOffset}>
        {ALARM_OPTIONS.map((opt) => (
          <Form.Dropdown.Item key={opt.value} value={opt.value} title={opt.title} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.TextField
        id="location"
        title="Location"
        placeholder="Add a location"
        value={location}
        onChange={setLocation}
      />

      <Form.TextField id="url" title="URL" placeholder="https://..." value={urlValue} onChange={setUrlValue} />

      <Form.TextArea id="notes" title="Notes" placeholder="Add notes..." value={notes} onChange={setNotes} />
    </Form>
  );
}

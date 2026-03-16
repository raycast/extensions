import { Action, ActionPanel, Form, Icon, LocalStorage, Toast, showToast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createAppleReminder,
  createAppleCalendarEvent,
  listWritableCalendars,
  listWritableReminderLists,
  openCalendarAtDate,
  WritableCalendar,
  WritableReminderList,
} from "./lib/apple-calendar";
import { parseKoreanSchedule } from "./lib/parse-korean-schedule";

type SubmitTarget = "calendar" | "reminder";

interface FormValues {
  sentence: string;
  targetType: SubmitTarget;
  calendarId: string;
  reminderListId: string;
  location?: string;
}

const CALENDAR_ID_STORAGE_KEY = "selectedCalendarId";
const REMINDER_LIST_ID_STORAGE_KEY = "selectedReminderListId";
const TARGET_TYPE_STORAGE_KEY = "selectedSubmitTarget";

export default function Command() {
  const [sentence, setSentence] = useState("");
  const [location, setLocation] = useState("");
  const [targetType, setTargetType] = useState<SubmitTarget>("calendar");
  const [isTargetManuallyOverridden, setIsTargetManuallyOverridden] = useState(false);
  const [calendarId, setCalendarId] = useState("");
  const [reminderListId, setReminderListId] = useState("");
  const [calendars, setCalendars] = useState<WritableCalendar[]>([]);
  const [reminderLists, setReminderLists] = useState<WritableReminderList[]>([]);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(true);
  const [isLoadingReminderLists, setIsLoadingReminderLists] = useState(true);
  const [calendarLoadError, setCalendarLoadError] = useState<string | undefined>();
  const [reminderLoadError, setReminderLoadError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parseResult = useMemo(() => {
    if (!sentence.trim()) {
      return null;
    }

    return parseKoreanSchedule(sentence);
  }, [sentence]);

  const persistCalendarId = useCallback((value: string) => {
    if (value) {
      void LocalStorage.setItem(CALENDAR_ID_STORAGE_KEY, value);
    } else {
      void LocalStorage.removeItem(CALENDAR_ID_STORAGE_KEY);
    }
  }, []);

  const persistReminderListId = useCallback((value: string) => {
    if (value) {
      void LocalStorage.setItem(REMINDER_LIST_ID_STORAGE_KEY, value);
    } else {
      void LocalStorage.removeItem(REMINDER_LIST_ID_STORAGE_KEY);
    }
  }, []);

  const persistTargetType = useCallback((value: SubmitTarget) => {
    void LocalStorage.setItem(TARGET_TYPE_STORAGE_KEY, value);
  }, []);

  const handleCalendarChange = useCallback(
    (value: string) => {
      setCalendarId(value);
      persistCalendarId(value);
    },
    [persistCalendarId],
  );

  const handleReminderListChange = useCallback(
    (value: string) => {
      setReminderListId(value);
      persistReminderListId(value);
    },
    [persistReminderListId],
  );

  const handleTargetTypeChange = useCallback(
    (value: string) => {
      const typedValue = (value as SubmitTarget) || "calendar";
      setTargetType(typedValue);
      setIsTargetManuallyOverridden(true);
      persistTargetType(typedValue);
    },
    [persistTargetType],
  );

  const loadCalendars = useCallback(async () => {
    setIsLoadingCalendars(true);
    setCalendarLoadError(undefined);

    try {
      const result = await listWritableCalendars();
      const cachedCalendarId = (await LocalStorage.getItem<string>(CALENDAR_ID_STORAGE_KEY)) ?? "";
      setCalendars(result.calendars);
      setCalendarId((current) => {
        const currentOrCachedId = current || cachedCalendarId;
        if (currentOrCachedId && result.calendars.some((calendar) => calendar.id === currentOrCachedId)) {
          persistCalendarId(currentOrCachedId);
          return currentOrCachedId;
        }

        const next = result.defaultCalendarIdentifier ?? result.calendars[0]?.id ?? "";
        persistCalendarId(next);
        return next;
      });
    } catch (error) {
      setCalendars([]);
      setCalendarId("");
      persistCalendarId("");
      setCalendarLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoadingCalendars(false);
    }
  }, [persistCalendarId]);

  const loadReminderLists = useCallback(async () => {
    setIsLoadingReminderLists(true);
    setReminderLoadError(undefined);

    try {
      const result = await listWritableReminderLists();
      const cachedReminderListId = (await LocalStorage.getItem<string>(REMINDER_LIST_ID_STORAGE_KEY)) ?? "";
      setReminderLists(result.reminderLists);
      setReminderListId((current) => {
        const currentOrCachedId = current || cachedReminderListId;
        if (currentOrCachedId && result.reminderLists.some((reminderList) => reminderList.id === currentOrCachedId)) {
          persistReminderListId(currentOrCachedId);
          return currentOrCachedId;
        }

        const next = result.defaultReminderListIdentifier ?? result.reminderLists[0]?.id ?? "";
        persistReminderListId(next);
        return next;
      });
    } catch (error) {
      setReminderLists([]);
      setReminderListId("");
      persistReminderListId("");
      setReminderLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoadingReminderLists(false);
    }
  }, [persistReminderListId]);

  const loadTargetTypePreference = useCallback(async () => {
    const cachedTargetType = (await LocalStorage.getItem<string>(TARGET_TYPE_STORAGE_KEY)) as SubmitTarget | undefined;
    if (cachedTargetType === "calendar" || cachedTargetType === "reminder") {
      setTargetType(cachedTargetType);
    }
  }, []);

  useEffect(() => {
    void loadCalendars();
    void loadReminderLists();
    void loadTargetTypePreference();
  }, [loadCalendars, loadReminderLists, loadTargetTypePreference]);

  useEffect(() => {
    if (!parseResult?.ok || isTargetManuallyOverridden) {
      return;
    }

    const autoTargetType: SubmitTarget = parseResult.value.intent === "deadline" ? "reminder" : "calendar";
    if (targetType !== autoTargetType) {
      setTargetType(autoTargetType);
      persistTargetType(autoTargetType);
    }
  }, [parseResult, isTargetManuallyOverridden, targetType, persistTargetType]);

  async function handleSubmit(values: FormValues, options: { openCalendarAfterCreate: boolean }) {
    if (values.targetType === "calendar" && !values.calendarId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Select a Calendar",
        message: "Please select a calendar before creating an item.",
      });
      return;
    }

    if (values.targetType === "reminder" && !values.reminderListId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Select a Reminder List",
        message: "Please select a reminder list before creating an item.",
      });
      return;
    }

    if (!parseResult) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing Input",
        message: "Please enter a schedule sentence.",
      });
      return;
    }

    if (!parseResult.ok) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Parsing Failed",
        message: parseResult.error,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const manualLocation = values.location?.trim();
      const parsed = {
        ...parseResult.value,
        location: manualLocation || parseResult.value.location,
      };

      if (values.targetType === "reminder") {
        const result = await createAppleReminder(parsed, {
          preferredReminderCalendarIdentifier: values.reminderListId,
        });

        await showToast({
          style: Toast.Style.Success,
          title: "Reminder Created",
          message: `List: ${result.reminderListName}`,
        });
      } else {
        const result = await createAppleCalendarEvent(parsed, {
          preferredCalendarIdentifier: values.calendarId,
        });

        let openCalendarFailedMessage: string | undefined;
        if (options.openCalendarAfterCreate) {
          try {
            await openCalendarAtDate(parsed.start);
          } catch (error) {
            openCalendarFailedMessage = error instanceof Error ? error.message : String(error);
          }
        }

        await showToast({
          style: Toast.Style.Success,
          title: openCalendarFailedMessage ? "Event Created (Failed to Open Calendar)" : "Event Created",
          message: openCalendarFailedMessage ? openCalendarFailedMessage : `Calendar: ${result.calendarName}`,
        });
      }

      setSentence("");
      setLocation("");
      setIsTargetManuallyOverridden(false);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Create Item",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const parsedPreview = parseResult?.ok ? parseResult.value : undefined;
  const manualLocation = location.trim();
  const previewLocation = manualLocation || parsedPreview?.location;
  const recommendedTargetType: SubmitTarget | undefined = parsedPreview
    ? parsedPreview.intent === "deadline"
      ? "reminder"
      : "calendar"
    : undefined;

  const handleSentenceChange = useCallback((value: string) => {
    setSentence(value);
    setIsTargetManuallyOverridden(false);
  }, []);

  return (
    <Form
      isLoading={isSubmitting || isLoadingCalendars || isLoadingReminderLists}
      actions={
        <ActionPanel>
          {targetType === "reminder" ? (
            <Action.SubmitForm<FormValues>
              icon={Icon.Bell}
              title="Create in Reminders"
              onSubmit={(values) => handleSubmit(values, { openCalendarAfterCreate: false })}
            />
          ) : (
            <>
              <Action.SubmitForm<FormValues>
                icon={Icon.Calendar}
                title="Create in Apple Calendar"
                onSubmit={(values) => handleSubmit(values, { openCalendarAfterCreate: false })}
              />
              <Action.SubmitForm<FormValues>
                icon={Icon.AppWindow}
                title="Create and Open Calendar"
                onSubmit={(values) => handleSubmit(values, { openCalendarAfterCreate: true })}
              />
            </>
          )}
          <Action
            icon={Icon.ArrowClockwise}
            title="Refresh Lists"
            onAction={() => {
              void loadCalendars();
              void loadReminderLists();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="sentence"
        title="Schedule Sentence"
        placeholder="e.g. 내일 오후 3시에 강남에서 팀 미팅"
        info="Parses Korean natural-language schedule text"
        value={sentence}
        onChange={handleSentenceChange}
      />

      <Form.Description
        title="Parse Status"
        text={
          !parseResult
            ? "Enter a sentence to preview the parsed result."
            : parseResult.ok
              ? "Ready to create"
              : `Error: ${parseResult.error}`
        }
      />
      {parsedPreview && (
        <Form.Description title="Parse Summary" text={formatPreviewSummary(parsedPreview, previewLocation)} />
      )}
      {recommendedTargetType && (
        <Form.Description
          title="Recommended Target"
          text={
            isTargetManuallyOverridden
              ? `${recommendedTargetType === "reminder" ? "Apple Reminder" : "Apple Calendar Event"} (manual selection kept)`
              : `${recommendedTargetType === "reminder" ? "Apple Reminder" : "Apple Calendar Event"} (auto-applied)`
          }
        />
      )}

      <Form.TextField
        id="location"
        title="Location (Optional)"
        placeholder="e.g. Gangnam Station Exit 1"
        info="If provided, this value overrides the parsed location."
        value={location}
        onChange={setLocation}
      />

      <Form.Dropdown id="targetType" title="Target" value={targetType} onChange={handleTargetTypeChange}>
        <Form.Dropdown.Item value="calendar" title="Apple Calendar Event" />
        <Form.Dropdown.Item value="reminder" title="Apple Reminder" />
      </Form.Dropdown>

      {targetType === "calendar" ? (
        <Form.Dropdown
          id="calendarId"
          title="Calendar"
          info="Select the calendar to create the event in."
          value={calendarId}
          onChange={handleCalendarChange}
        >
          {isLoadingCalendars ? (
            <Form.Dropdown.Item value="" title="Loading calendars..." />
          ) : calendars.length > 0 ? (
            calendars.map((calendar) => (
              <Form.Dropdown.Item
                key={calendar.id}
                value={calendar.id}
                title={calendar.isDefault ? `${calendar.title} (Default)` : calendar.title}
                keywords={[calendar.sourceTitle]}
              />
            ))
          ) : (
            <Form.Dropdown.Item value="" title="No writable calendars available" />
          )}
        </Form.Dropdown>
      ) : (
        <Form.Dropdown
          id="reminderListId"
          title="Reminder List"
          info="Select the reminder list to add the item to."
          value={reminderListId}
          onChange={handleReminderListChange}
        >
          {isLoadingReminderLists ? (
            <Form.Dropdown.Item value="" title="Loading reminder lists..." />
          ) : reminderLists.length > 0 ? (
            reminderLists.map((reminderList) => (
              <Form.Dropdown.Item
                key={reminderList.id}
                value={reminderList.id}
                title={reminderList.isDefault ? `${reminderList.title} (Default)` : reminderList.title}
                keywords={[reminderList.sourceTitle]}
              />
            ))
          ) : (
            <Form.Dropdown.Item value="" title="No writable reminder lists available" />
          )}
        </Form.Dropdown>
      )}

      {calendarLoadError && <Form.Description title="Calendar Error" text={calendarLoadError} />}
      {reminderLoadError && <Form.Description title="Reminder Error" text={reminderLoadError} />}
    </Form>
  );
}

function formatPreviewSummary(
  parsedPreview: { title: string; start: Date; end: Date; allDay: boolean; intent: "event" | "deadline" },
  location: string | undefined,
): string {
  const typeText = parsedPreview.intent === "deadline" ? "Deadline" : "Event";
  const timeLabel = parsedPreview.intent === "deadline" ? "Due" : "Time";
  const timeText =
    parsedPreview.intent === "deadline"
      ? formatDate(parsedPreview.start, parsedPreview.allDay)
      : parsedPreview.allDay
        ? `${formatDate(parsedPreview.start, true)} (all-day)`
        : `${formatDate(parsedPreview.start, false)} ~ ${formatDate(parsedPreview.end, false)}`;
  const locationText = location || "(none)";
  return `Type: ${typeText} | Title: ${parsedPreview.title} | ${timeLabel}: ${timeText} | Location: ${locationText}`;
}

function formatDate(value: Date, allDay: boolean): string {
  if (allDay) {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    }).format(value);
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(value);
}

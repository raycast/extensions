import { Action, ActionPanel, Form, Icon, LocalStorage, Toast, showToast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  CalendarRecurrence,
  createAppleCalendarEvent,
  createAppleReminder,
  listWritableCalendars,
  listWritableReminderLists,
  openCalendarAtDate,
  WritableCalendar,
  WritableReminderList,
} from "./lib/apple-calendar";
import {
  firstBatchParseResult,
  MAX_BATCH_ITEMS,
  parseKoreanScheduleBatch,
  ParsedBatchError,
  ParsedBatchItem,
} from "./lib/parse-korean-schedule-batch";
import { ParsedRecurrence, ParsedSchedule } from "./lib/parse-korean-schedule";

type SubmitTarget = "calendar" | "reminder";
type RecurrenceEndType = "count" | "until";

interface FormValues {
  sentence: string;
  targetType: SubmitTarget;
  calendarId: string;
  reminderListId: string;
  location?: string;
  recurrenceEndType: RecurrenceEndType;
  recurrenceCount: string;
  recurrenceUntil: Date | null;
}

const CALENDAR_ID_STORAGE_KEY = "selectedCalendarId";
const REMINDER_LIST_ID_STORAGE_KEY = "selectedReminderListId";
const TARGET_TYPE_STORAGE_KEY = "selectedSubmitTarget";
const RECURRENCE_END_TYPE_STORAGE_KEY = "recurrenceEndType";
const RECURRENCE_COUNT_STORAGE_KEY = "recurrenceCount";
const RECURRENCE_UNTIL_STORAGE_KEY = "recurrenceUntilIso";
const MAX_RECURRENCE_COUNT = 50;

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
  const [recurrenceEndType, setRecurrenceEndType] = useState<RecurrenceEndType>("count");
  const [recurrenceCount, setRecurrenceCount] = useState("10");
  const [recurrenceUntil, setRecurrenceUntil] = useState<Date | null>(defaultRecurrenceUntil());

  const parsedBatch = useMemo(() => parseKoreanScheduleBatch(sentence), [sentence]);
  const parseResult = useMemo(() => firstBatchParseResult(parsedBatch), [parsedBatch]);

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

  const persistRecurrenceEndType = useCallback((value: RecurrenceEndType) => {
    void LocalStorage.setItem(RECURRENCE_END_TYPE_STORAGE_KEY, value);
  }, []);

  const persistRecurrenceCount = useCallback((value: string) => {
    if (value) {
      void LocalStorage.setItem(RECURRENCE_COUNT_STORAGE_KEY, value);
    } else {
      void LocalStorage.removeItem(RECURRENCE_COUNT_STORAGE_KEY);
    }
  }, []);

  const persistRecurrenceUntil = useCallback((value: Date | null) => {
    if (value) {
      void LocalStorage.setItem(RECURRENCE_UNTIL_STORAGE_KEY, value.toISOString());
    } else {
      void LocalStorage.removeItem(RECURRENCE_UNTIL_STORAGE_KEY);
    }
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

  const handleRecurrenceEndTypeChange = useCallback(
    (value: string) => {
      const typed = value === "until" ? "until" : "count";
      setRecurrenceEndType(typed);
      persistRecurrenceEndType(typed);
    },
    [persistRecurrenceEndType],
  );

  const handleRecurrenceCountChange = useCallback(
    (value: string) => {
      setRecurrenceCount(value);
      persistRecurrenceCount(value);
    },
    [persistRecurrenceCount],
  );

  const handleRecurrenceUntilChange = useCallback(
    (value: Date | null) => {
      setRecurrenceUntil(value);
      persistRecurrenceUntil(value);
    },
    [persistRecurrenceUntil],
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

  const loadPreferences = useCallback(async () => {
    const cachedTargetType = (await LocalStorage.getItem<string>(TARGET_TYPE_STORAGE_KEY)) as SubmitTarget | undefined;
    if (cachedTargetType === "calendar" || cachedTargetType === "reminder") {
      setTargetType(cachedTargetType);
    }

    const cachedRecurrenceEndType = (await LocalStorage.getItem<string>(RECURRENCE_END_TYPE_STORAGE_KEY)) as
      | RecurrenceEndType
      | undefined;
    if (cachedRecurrenceEndType === "count" || cachedRecurrenceEndType === "until") {
      setRecurrenceEndType(cachedRecurrenceEndType);
    }

    const cachedRecurrenceCount = (await LocalStorage.getItem<string>(RECURRENCE_COUNT_STORAGE_KEY)) ?? "";
    if (cachedRecurrenceCount) {
      setRecurrenceCount(cachedRecurrenceCount);
    }

    const cachedRecurrenceUntilIso = await LocalStorage.getItem<string>(RECURRENCE_UNTIL_STORAGE_KEY);
    if (cachedRecurrenceUntilIso) {
      const parsedDate = new Date(cachedRecurrenceUntilIso);
      if (!Number.isNaN(parsedDate.getTime())) {
        setRecurrenceUntil(parsedDate);
      }
    }
  }, []);

  useEffect(() => {
    void loadCalendars();
    void loadReminderLists();
    void loadPreferences();
  }, [loadCalendars, loadReminderLists, loadPreferences]);

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
        title: "Calendar Selection Required",
        message: "Please select a calendar before submitting.",
      });
      return;
    }

    if (values.targetType === "reminder" && !values.reminderListId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Reminder List Selection Required",
        message: "Please select a reminder list before submitting.",
      });
      return;
    }

    const submitBatch = parseKoreanScheduleBatch(values.sentence);
    if (submitBatch.tooManyItems) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Batch Item Limit Reached",
        message: `You can submit up to ${MAX_BATCH_ITEMS} clauses at a time.`,
      });
      return;
    }

    if (submitBatch.items.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Parsing Failed",
        message: submitBatch.errors[0]?.error ?? "Could not parse the schedule sentence.",
      });
      return;
    }

    if (values.targetType === "reminder" && submitBatch.items.some((item) => item.value.recurrence)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Recurring Events Not Supported for Reminders",
        message: "Recurring events can currently be created only in Apple Calendar.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const manualLocation = values.location?.trim();
      const failures: string[] = [];
      let successCount = 0;
      let lastCreatedCalendarStart: Date | undefined;

      for (const item of submitBatch.items) {
        const parsed = {
          ...item.value,
          location: manualLocation || item.value.location,
        };

        try {
          if (values.targetType === "reminder") {
            await createAppleReminder(parsed, {
              preferredReminderCalendarIdentifier: values.reminderListId,
            });
            successCount += 1;
            continue;
          }

          const recurrenceOrError = buildRecurrenceForSubmit(parsed, values);
          if (recurrenceOrError instanceof Error) {
            throw recurrenceOrError;
          }

          const result = await createAppleCalendarEvent(parsed, {
            preferredCalendarIdentifier: values.calendarId,
            recurrence: recurrenceOrError,
          });
          successCount += 1;
          lastCreatedCalendarStart = parsed.start;
          void result;
        } catch (error) {
          const prefix = submitBatch.isBatch ? `[${item.input}] ` : "";
          failures.push(`${prefix}${error instanceof Error ? error.message : String(error)}`);
        }
      }

      let openCalendarFailedMessage: string | undefined;
      if (
        options.openCalendarAfterCreate &&
        values.targetType === "calendar" &&
        successCount > 0 &&
        lastCreatedCalendarStart
      ) {
        try {
          await openCalendarAtDate(lastCreatedCalendarStart);
        } catch (error) {
          openCalendarFailedMessage = error instanceof Error ? error.message : String(error);
        }
      }

      if (successCount === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Create Items",
          message: failures[0] ?? "No items were created.",
        });
        return;
      }

      if (failures.length > 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: `Partial Success (${successCount} succeeded, ${failures.length} failed)`,
          message: failures[0],
        });
      } else {
        const baseTitle =
          values.targetType === "reminder" ? `Reminders Created (${successCount})` : `Events Created (${successCount})`;
        await showToast({
          style: Toast.Style.Success,
          title: openCalendarFailedMessage ? `${baseTitle}, Failed to Open Calendar` : baseTitle,
          message: openCalendarFailedMessage,
        });
      }

      if (failures.length === 0) {
        setSentence("");
        setLocation("");
        setIsTargetManuallyOverridden(false);
      }
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
  const parseStatusText = buildParseStatusText({
    sentence,
    parsedBatch,
    parseResult,
  });
  const parsedCount = parsedBatch.items.length;
  const isRecurringPreview = Boolean(parsedPreview?.recurrence);
  const shouldShowRecurrenceOptions = targetType === "calendar" && isRecurringPreview;

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
              title={parsedCount > 1 ? `Add to Reminders (${parsedCount})` : "Add to Reminders"}
              onSubmit={(values) => handleSubmit(values, { openCalendarAfterCreate: false })}
            />
          ) : (
            <>
              <Action.SubmitForm<FormValues>
                icon={Icon.Calendar}
                title={parsedCount > 1 ? `Add to Apple Calendar (${parsedCount})` : "Add to Apple Calendar"}
                onSubmit={(values) => handleSubmit(values, { openCalendarAfterCreate: false })}
              />
              <Action.SubmitForm<FormValues>
                icon={Icon.AppWindow}
                title={parsedCount > 1 ? `Add and Open Calendar (${parsedCount})` : "Add and Open Calendar"}
                onSubmit={(values) => handleSubmit(values, { openCalendarAfterCreate: true })}
              />
            </>
          )}
          <Action
            icon={Icon.ArrowClockwise}
            title="Reload Lists"
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
        placeholder="e.g. Next Tuesday 3:30 PM team meeting in Gangnam"
        info={`Korean natural-language parsing (up to ${MAX_BATCH_ITEMS} clauses)`}
        value={sentence}
        onChange={handleSentenceChange}
      />

      <Form.Description title="Parse Status" text={parseStatusText} />
      {parsedPreview && (
        <Form.Description title="Parse Summary" text={formatPreviewSummary(parsedPreview, previewLocation)} />
      )}
      {parsedBatch.isBatch && parsedBatch.items.length > 0 && (
        <Form.Description title="Batch Preview" text={formatBatchPreview(parsedBatch.items)} />
      )}
      {parsedBatch.errors.length > 0 && (
        <Form.Description title="Batch Errors" text={formatBatchErrors(parsedBatch.errors)} />
      )}
      {recommendedTargetType && (
        <Form.Description
          title="Recommended Target"
          text={
            isTargetManuallyOverridden
              ? `${recommendedTargetType === "reminder" ? "Reminder Item" : "Apple Calendar Event"} (manual selection kept)`
              : `${recommendedTargetType === "reminder" ? "Reminder Item" : "Apple Calendar Event"} (auto-applied)`
          }
        />
      )}

      <Form.TextField
        id="location"
        title="Location (Optional)"
        placeholder="e.g. Gangnam Station Exit 1"
        info="Manual input overrides the parsed location from the sentence."
        value={location}
        onChange={setLocation}
      />

      <Form.Dropdown id="targetType" title="Target" value={targetType} onChange={handleTargetTypeChange}>
        <Form.Dropdown.Item value="calendar" title="Apple Calendar Event" />
        <Form.Dropdown.Item value="reminder" title="Reminder Item" />
      </Form.Dropdown>

      {targetType === "calendar" ? (
        <Form.Dropdown
          id="calendarId"
          title="Calendar"
          info="Select the calendar to create events in."
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
          info="Select the reminder list to add items to."
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

      {isRecurringPreview && (
        <Form.Description
          title="Recurrence Detected"
          text={
            targetType === "calendar"
              ? "Recurring events will be created in Apple Calendar. Choose how the recurrence ends."
              : "Recurring events can currently be created only in Apple Calendar."
          }
        />
      )}

      {shouldShowRecurrenceOptions && (
        <>
          <Form.Dropdown
            id="recurrenceEndType"
            title="Recurrence End"
            value={recurrenceEndType}
            onChange={handleRecurrenceEndTypeChange}
          >
            <Form.Dropdown.Item value="count" title="End by count" />
            <Form.Dropdown.Item value="until" title="End by date" />
          </Form.Dropdown>

          {recurrenceEndType === "count" ? (
            <Form.TextField
              id="recurrenceCount"
              title="Recurrence Count"
              info={`1-${MAX_RECURRENCE_COUNT} times`}
              value={recurrenceCount}
              onChange={handleRecurrenceCountChange}
            />
          ) : (
            <Form.DatePicker
              id="recurrenceUntil"
              title="Recurrence End Date"
              info="Must be after the start date, within 1 year"
              value={recurrenceUntil}
              onChange={handleRecurrenceUntilChange}
            />
          )}
        </>
      )}

      {calendarLoadError && <Form.Description title="Calendar Error" text={calendarLoadError} />}
      {reminderLoadError && <Form.Description title="Reminder Error" text={reminderLoadError} />}
    </Form>
  );
}

function buildRecurrenceForSubmit(parsed: ParsedSchedule, values: FormValues): CalendarRecurrence | undefined | Error {
  const recurrence = parsed.recurrence;
  if (!recurrence) {
    return undefined;
  }

  if (values.recurrenceEndType === "count") {
    const count = Number.parseInt(values.recurrenceCount, 10);
    if (Number.isNaN(count) || count < 1 || count > MAX_RECURRENCE_COUNT) {
      return new Error(`Recurrence count must be between 1 and ${MAX_RECURRENCE_COUNT}.`);
    }
    return {
      ...recurrence,
      interval: 1,
      end: {
        type: "count",
        count,
      },
    };
  }

  const until = values.recurrenceUntil ? new Date(values.recurrenceUntil) : null;
  if (!until || Number.isNaN(until.getTime())) {
    return new Error("Please select a recurrence end date.");
  }

  if (until.getTime() < parsed.start.getTime()) {
    return new Error("Recurrence end date must be after the start date.");
  }

  const oneYearAfterStart = new Date(parsed.start);
  oneYearAfterStart.setFullYear(oneYearAfterStart.getFullYear() + 1);
  if (until.getTime() > oneYearAfterStart.getTime()) {
    return new Error("Recurrence end date must be within 1 year of the start date.");
  }

  return {
    ...recurrence,
    interval: 1,
    end: {
      type: "until",
      untilEpochMs: until.getTime(),
    },
  };
}

function buildParseStatusText({
  sentence,
  parsedBatch,
  parseResult,
}: {
  sentence: string;
  parsedBatch: ReturnType<typeof parseKoreanScheduleBatch>;
  parseResult: ReturnType<typeof firstBatchParseResult>;
}): string {
  if (!sentence.trim()) {
    return "Enter a sentence to preview parsing.";
  }

  if (parsedBatch.tooManyItems) {
    return `Up to ${MAX_BATCH_ITEMS} clauses are supported at once.`;
  }

  if (parsedBatch.items.length > 0 && parsedBatch.errors.length > 0) {
    return `Partially parsed (${parsedBatch.items.length} succeeded, ${parsedBatch.errors.length} failed)`;
  }

  if (parseResult?.ok) {
    return parsedBatch.isBatch ? `${parsedBatch.items.length} items ready` : "Ready to submit";
  }

  if (parseResult && !parseResult.ok) {
    return `Error: ${parseResult.error}`;
  }

  return "No parse result.";
}

function formatBatchPreview(items: ParsedBatchItem[]): string {
  return items
    .map((item, index) => {
      const recurrence = item.value.recurrence ? ` / recurrence:${formatRecurrence(item.value.recurrence)}` : "";
      const inherited = item.inheritedDate ? " (date inherited)" : "";
      return `${index + 1}. ${item.value.title} - ${formatDate(item.value.start, item.value.allDay)}${recurrence}${inherited}`;
    })
    .join(" | ");
}

function formatBatchErrors(errors: ParsedBatchError[]): string {
  return errors.map((error, index) => `${index + 1}. [${error.input}] ${error.error}`).join(" | ");
}

function formatPreviewSummary(parsedPreview: ParsedSchedule, location: string | undefined): string {
  const typeText = parsedPreview.intent === "deadline" ? "Deadline" : "Event";
  const timeLabel = parsedPreview.intent === "deadline" ? "Due" : "Time";
  const timeText =
    parsedPreview.intent === "deadline"
      ? formatDate(parsedPreview.start, parsedPreview.allDay)
      : parsedPreview.allDay
        ? `${formatDate(parsedPreview.start, true)} (all day)`
        : `${formatDate(parsedPreview.start, false)} ~ ${formatDate(parsedPreview.end, false)}`;
  const locationText = location || "(none)";
  const recurrenceText = parsedPreview.recurrence ? ` | Recurrence: ${formatRecurrence(parsedPreview.recurrence)}` : "";
  return `Type: ${typeText} | Title: ${parsedPreview.title} | ${timeLabel}: ${timeText} | Location: ${locationText}${recurrenceText}`;
}

function formatRecurrence(recurrence: ParsedRecurrence): string {
  if (recurrence.frequency === "daily") {
    return "Daily";
  }
  if (recurrence.frequency === "weekly") {
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weekday = weekdays[recurrence.weekday ?? 0];
    return `Weekly ${weekday}`;
  }
  return `Monthly ${recurrence.dayOfMonth ?? 1}`;
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
    hour12: false,
  }).format(value);
}

function defaultRecurrenceUntil(): Date {
  const value = new Date();
  value.setMonth(value.getMonth() + 3);
  return value;
}

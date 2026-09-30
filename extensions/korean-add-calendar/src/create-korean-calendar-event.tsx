import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  LocalStorage,
  Toast,
  confirmAlert,
  showToast,
  type LaunchProps,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  createAppleCalendarEvent,
  createAppleReminder,
  CreationOutcomeUnknownError,
  listWritableCalendars,
  listWritableReminderLists,
  openCalendarAtDate,
  WritableCalendar,
  WritableReminderList,
} from "./lib/apple-calendar";
import {
  defaultRecurrenceUntil,
  getRecurrenceDateWindow,
  MAX_RECURRENCE_COUNT,
  prepareCalendarBatchForSubmit,
  RecurrenceEndType,
} from "./lib/calendar-recurrence";
import { resolveDestinationSelection } from "./lib/destination-selection";
import { resolveInitialSentence } from "./lib/launch-input";
import {
  BatchRetrySnapshot,
  buildBatchRetrySnapshot,
  firstBatchParseResult,
  MAX_BATCH_ITEMS,
  parseKoreanScheduleBatchWithRetrySnapshot,
  ParsedBatchError,
  ParsedBatchItem,
} from "./lib/parse-korean-schedule-batch";
import { ParsedRecurrence, ParsedSchedule } from "./lib/parse-korean-schedule";
import {
  buildCreationOutcomeKey,
  partitionUnconfirmedCreationKeys,
  parseStoredUnconfirmedCreationKeys,
  UNKNOWN_CREATION_OUTCOME_KEY,
} from "./lib/creation-outcome-guard";

type SubmitTarget = "calendar" | "reminder";

interface FormValues {
  sentence: string;
  targetType: SubmitTarget;
  calendarId: string;
  reminderListId: string;
  location?: string;
  recurrenceEndType?: RecurrenceEndType;
  recurrenceCount?: string;
  recurrenceUntil?: Date | null;
}

const CALENDAR_ID_STORAGE_KEY = "selectedCalendarId";
const REMINDER_LIST_ID_STORAGE_KEY = "selectedReminderListId";
const TARGET_TYPE_STORAGE_KEY = "selectedSubmitTarget";
const RECURRENCE_END_TYPE_STORAGE_KEY = "recurrenceEndType";
const RECURRENCE_COUNT_STORAGE_KEY = "recurrenceCount";
const RECURRENCE_UNTIL_STORAGE_KEY = "recurrenceUntilIso";
const UNCONFIRMED_CREATION_KEYS_STORAGE_KEY = "unconfirmedCreationKeys";
const KOREAN_INPUT_EXAMPLE = "다음주 화요일 오후 3시 반에 강남에서 팀 미팅";

function persistPreference(key: string, value?: string): void {
  const operation = value ? LocalStorage.setItem(key, value) : LocalStorage.removeItem(key);
  void operation.catch((error: unknown) =>
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to save preferences",
      message: error instanceof Error ? error.message : String(error),
    }),
  );
}

async function persistUnconfirmedCreationKeys(keys: string[]): Promise<void> {
  const operation = keys.length
    ? LocalStorage.setItem(UNCONFIRMED_CREATION_KEYS_STORAGE_KEY, JSON.stringify(keys))
    : LocalStorage.removeItem(UNCONFIRMED_CREATION_KEYS_STORAGE_KEY);
  try {
    await operation;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to save duplicate-risk warning",
      message: `Keep this command open and check Calendar or Reminders before retrying. ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
}

export default function Command(props: LaunchProps<{ arguments: { sentence?: string } }>) {
  const [sentence, setSentence] = useState(() => resolveInitialSentence(props));
  const [location, setLocation] = useState("");
  const [targetType, setTargetType] = useState<SubmitTarget>("calendar");
  const [isTargetManuallyOverridden, setIsTargetManuallyOverridden] = useState(false);
  const [calendarId, setCalendarId] = useState("");
  const [reminderListId, setReminderListId] = useState("");
  const [calendars, setCalendars] = useState<WritableCalendar[]>([]);
  const [reminderLists, setReminderLists] = useState<WritableReminderList[]>([]);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);
  const [isLoadingReminderLists, setIsLoadingReminderLists] = useState(false);
  const [hasLoadedCalendars, setHasLoadedCalendars] = useState(false);
  const [hasLoadedReminderLists, setHasLoadedReminderLists] = useState(false);
  const [hasLoadedPreferences, setHasLoadedPreferences] = useState(false);
  const [calendarLoadError, setCalendarLoadError] = useState<string | undefined>();
  const [reminderLoadError, setReminderLoadError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recurrenceEndType, setRecurrenceEndType] = useState<RecurrenceEndType>("count");
  const [recurrenceCount, setRecurrenceCount] = useState("10");
  const [recurrenceUntil, setRecurrenceUntil] = useState<Date | null>(defaultRecurrenceUntil());
  const [retrySnapshot, setRetrySnapshot] = useState<BatchRetrySnapshot | undefined>();
  const [unconfirmedCreationKeys, setUnconfirmedCreationKeys] = useState<string[]>([]);
  const submissionInProgress = useRef(false);

  const parsedBatch = useMemo(() => {
    return parseKoreanScheduleBatchWithRetrySnapshot(sentence, retrySnapshot);
  }, [retrySnapshot, sentence]);
  const parseResult = useMemo(() => firstBatchParseResult(parsedBatch), [parsedBatch]);
  const batchIntent = useMemo(() => summarizeBatchIntent(parsedBatch.items), [parsedBatch.items]);
  const hasRecurringItems = useMemo(
    () => parsedBatch.items.some((item) => Boolean(item.value.recurrence)),
    [parsedBatch.items],
  );
  const recurrenceDateWindow = useMemo(() => getRecurrenceDateWindow(parsedBatch.items), [parsedBatch.items]);
  const recurrenceMinTime = recurrenceDateWindow?.min.getTime();
  const recurrenceMaxTime = recurrenceDateWindow?.max.getTime();

  const persistCalendarId = useCallback((value: string) => {
    persistPreference(CALENDAR_ID_STORAGE_KEY, value);
  }, []);

  const persistReminderListId = useCallback((value: string) => {
    persistPreference(REMINDER_LIST_ID_STORAGE_KEY, value);
  }, []);

  const persistTargetType = useCallback((value: SubmitTarget) => {
    persistPreference(TARGET_TYPE_STORAGE_KEY, value);
  }, []);

  const persistRecurrenceEndType = useCallback((value: RecurrenceEndType) => {
    persistPreference(RECURRENCE_END_TYPE_STORAGE_KEY, value);
  }, []);

  const persistRecurrenceCount = useCallback((value: string) => {
    persistPreference(RECURRENCE_COUNT_STORAGE_KEY, value);
  }, []);

  const persistRecurrenceUntil = useCallback((value: Date | null) => {
    persistPreference(RECURRENCE_UNTIL_STORAGE_KEY, value?.toISOString());
  }, []);

  const handleCalendarChange = useCallback(
    (value: string) => {
      setCalendarId(value);
      setCalendarLoadError(undefined);
      persistCalendarId(value);
    },
    [persistCalendarId],
  );

  const handleReminderListChange = useCallback(
    (value: string) => {
      setReminderListId(value);
      setReminderLoadError(undefined);
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
      const selection = resolveDestinationSelection({
        currentId: calendarId,
        storedId: cachedCalendarId,
        defaultId: result.defaultCalendarIdentifier,
        availableIds: result.calendars.map((calendar) => calendar.id),
      });
      setCalendars(result.calendars);
      setCalendarId(selection.selectedId);
      if (selection.requiresReselection) {
        setCalendarLoadError("The previously selected calendar is no longer available. Select another calendar.");
      } else if (selection.selectedId) {
        persistCalendarId(selection.selectedId);
      }
    } catch (error) {
      setCalendars([]);
      setCalendarId("");
      setCalendarLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setHasLoadedCalendars(true);
      setIsLoadingCalendars(false);
    }
  }, [calendarId, persistCalendarId]);

  const loadReminderLists = useCallback(async () => {
    setIsLoadingReminderLists(true);
    setReminderLoadError(undefined);

    try {
      const result = await listWritableReminderLists();
      const cachedReminderListId = (await LocalStorage.getItem<string>(REMINDER_LIST_ID_STORAGE_KEY)) ?? "";
      const selection = resolveDestinationSelection({
        currentId: reminderListId,
        storedId: cachedReminderListId,
        defaultId: result.defaultReminderListIdentifier,
        availableIds: result.reminderLists.map((reminderList) => reminderList.id),
      });
      setReminderLists(result.reminderLists);
      setReminderListId(selection.selectedId);
      if (selection.requiresReselection) {
        setReminderLoadError("The previously selected reminder list is no longer available. Select another list.");
      } else if (selection.selectedId) {
        persistReminderListId(selection.selectedId);
      }
    } catch (error) {
      setReminderLists([]);
      setReminderListId("");
      setReminderLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setHasLoadedReminderLists(true);
      setIsLoadingReminderLists(false);
    }
  }, [persistReminderListId, reminderListId]);

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

  const loadUnconfirmedCreationKeys = useCallback(async () => {
    try {
      const cachedValue = await LocalStorage.getItem<string>(UNCONFIRMED_CREATION_KEYS_STORAGE_KEY);
      setUnconfirmedCreationKeys(parseStoredUnconfirmedCreationKeys(cachedValue));
    } catch (error) {
      setUnconfirmedCreationKeys([UNKNOWN_CREATION_OUTCOME_KEY]);
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not verify the previous creation outcome",
        message: `Check Calendar or Reminders before creating items. ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    }
  }, []);

  useEffect(() => {
    let isActive = true;
    void (async () => {
      try {
        await loadUnconfirmedCreationKeys();
        await loadPreferences();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load saved preferences",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        if (isActive) {
          setHasLoadedPreferences(true);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [loadPreferences, loadUnconfirmedCreationKeys]);

  useEffect(() => {
    if (!hasLoadedPreferences) {
      return;
    }

    if (targetType === "calendar" && !hasLoadedCalendars && !isLoadingCalendars) {
      void loadCalendars();
    }
    if (targetType === "reminder" && !hasLoadedReminderLists && !isLoadingReminderLists) {
      void loadReminderLists();
    }
  }, [
    hasLoadedCalendars,
    hasLoadedPreferences,
    hasLoadedReminderLists,
    isLoadingCalendars,
    isLoadingReminderLists,
    loadCalendars,
    loadReminderLists,
    targetType,
  ]);

  useEffect(() => {
    if (!batchIntent || batchIntent === "mixed" || isTargetManuallyOverridden) {
      return;
    }

    const autoTargetType: SubmitTarget = batchIntent === "deadline" ? "reminder" : "calendar";
    if (targetType !== autoTargetType) {
      setTargetType(autoTargetType);
      persistTargetType(autoTargetType);
    }
  }, [batchIntent, isTargetManuallyOverridden, targetType, persistTargetType]);

  useEffect(() => {
    if (recurrenceMinTime === undefined || recurrenceMaxTime === undefined) {
      return;
    }

    const currentDay = recurrenceUntil ? dateOnlyTimestamp(recurrenceUntil) : undefined;
    if (currentDay !== undefined && currentDay >= recurrenceMinTime && currentDay <= recurrenceMaxTime) {
      return;
    }

    const next = defaultRecurrenceUntil(new Date(recurrenceMinTime), new Date(recurrenceMaxTime));
    setRecurrenceUntil(next);
    persistRecurrenceUntil(next);
  }, [recurrenceMaxTime, recurrenceMinTime, recurrenceUntil, persistRecurrenceUntil]);

  async function handleSubmit(values: FormValues, options: { openCalendarAfterCreate: boolean }) {
    if (submissionInProgress.current) {
      return;
    }

    submissionInProgress.current = true;
    try {
      await submitValues(values, options);
    } finally {
      submissionInProgress.current = false;
    }
  }

  async function submitValues(values: FormValues, options: { openCalendarAfterCreate: boolean }) {
    if (values.targetType === "calendar" && !values.calendarId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Calendar selection required",
        message: "Select a calendar before creating items.",
      });
      return;
    }

    if (values.targetType === "reminder" && !values.reminderListId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Reminder list selection required",
        message: "Select a reminder list before creating items.",
      });
      return;
    }

    const submitBatch = parseKoreanScheduleBatchWithRetrySnapshot(values.sentence, retrySnapshot);
    if (submitBatch.tooManyItems) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Sentence split limit reached",
        message: `You can create up to ${MAX_BATCH_ITEMS} items at once.`,
      });
      return;
    }

    if (submitBatch.errors.length > 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Fix parsing errors before creating items",
        message: `[${submitBatch.errors[0].input}] ${submitBatch.errors[0].error}`,
      });
      return;
    }

    if (submitBatch.items.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Parsing failed",
        message: submitBatch.errors[0]?.error ?? "Could not recognize the schedule sentence.",
      });
      return;
    }

    if (summarizeBatchIntent(submitBatch.items) === "mixed") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Mixed schedule types",
        message: "Create Calendar events and Reminder items in separate submissions.",
      });
      return;
    }

    if (values.targetType === "reminder" && submitBatch.items.some((item) => item.value.recurrence)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Recurring schedule limitation",
        message: "Recurring schedules can currently be created only as Apple Calendar events.",
      });
      return;
    }

    const manualLocation = values.location?.trim();
    const recurrenceValues = {
      recurrenceEndType: values.recurrenceEndType ?? recurrenceEndType,
      recurrenceCount: values.recurrenceCount ?? recurrenceCount,
      recurrenceUntil: values.recurrenceUntil ?? recurrenceUntil,
    };
    const preparedItems =
      values.targetType === "calendar"
        ? prepareCalendarBatchForSubmit(submitBatch.items, recurrenceValues, manualLocation)
        : submitBatch.items.map((item) => ({
            item,
            parsed: {
              ...item.value,
              location: manualLocation || item.value.location,
            },
            recurrence: undefined,
          }));

    if (preparedItems instanceof Error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid recurrence settings",
        message: preparedItems.message,
      });
      return;
    }

    const submissions = preparedItems.map((prepared) => ({
      ...prepared,
      creationOutcomeKey: buildCreationOutcomeKey({
        targetType: values.targetType,
        parsed: prepared.parsed,
      }),
    }));
    const unconfirmedKeyPartition = partitionUnconfirmedCreationKeys(
      unconfirmedCreationKeys,
      submissions.map((submission) => submission.creationOutcomeKey),
    );
    const matchingUnconfirmedKeys = unconfirmedKeyPartition.matching;
    const remainingUnconfirmedKeys = unconfirmedKeyPartition.remaining;

    if (matchingUnconfirmedKeys.length > 0) {
      const matchingItemCount = matchingUnconfirmedKeys.includes(UNKNOWN_CREATION_OUTCOME_KEY)
        ? 1
        : matchingUnconfirmedKeys.length;
      const shouldRetry = await confirmAlert({
        icon: Icon.ExclamationMark,
        title: "Previous creation outcome is unknown",
        message: `${matchingItemCount} matching item${matchingItemCount === 1 ? "" : "s"} may already exist. Check Calendar or Reminders before continuing to avoid duplicates.`,
        primaryAction: {
          title: "Retry After Checking",
          style: Alert.ActionStyle.Default,
        },
        dismissAction: {
          title: "Cancel",
          style: Alert.ActionStyle.Cancel,
        },
      });
      if (!shouldRetry) {
        return;
      }
      setUnconfirmedCreationKeys(remainingUnconfirmedKeys);
      await persistUnconfirmedCreationKeys(remainingUnconfirmedKeys);
    }

    setIsSubmitting(true);
    try {
      const failures: Array<{ item: ParsedBatchItem; message: string; creationOutcomeKey: string }> = [];
      const unknownOutcomes: Array<{ item: ParsedBatchItem; message: string; creationOutcomeKey: string }> = [];
      const retryableOutcomes: Array<{ item: ParsedBatchItem; message: string; creationOutcomeKey: string }> = [];
      let successCount = 0;
      let lastCreatedCalendarStart: Date | undefined;

      for (const { item, parsed, recurrence, creationOutcomeKey } of submissions) {
        try {
          if (values.targetType === "reminder") {
            await createAppleReminder(parsed, {
              preferredReminderCalendarIdentifier: values.reminderListId,
            });
            successCount += 1;
            continue;
          }

          const result = await createAppleCalendarEvent(parsed, {
            preferredCalendarIdentifier: values.calendarId,
            recurrence,
          });
          successCount += 1;
          lastCreatedCalendarStart = parsed.start;
          void result;
        } catch (error) {
          const prefix = submitBatch.isBatch ? `[${item.input}] ` : "";
          const outcome = {
            item,
            creationOutcomeKey,
            message: `${prefix}${error instanceof Error ? error.message : String(error)}`,
          };
          retryableOutcomes.push(outcome);
          if (error instanceof CreationOutcomeUnknownError) {
            unknownOutcomes.push(outcome);
          } else {
            failures.push(outcome);
          }
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

      if (unknownOutcomes.length > 0) {
        const nextRetrySnapshot = buildBatchRetrySnapshot(retryableOutcomes.map((outcome) => outcome.item));
        setRetrySnapshot(nextRetrySnapshot);
        setSentence(nextRetrySnapshot.sentence);
        const nextUnconfirmedKeys = [
          ...new Set([...remainingUnconfirmedKeys, ...unknownOutcomes.map((outcome) => outcome.creationOutcomeKey)]),
        ];
        setUnconfirmedCreationKeys(nextUnconfirmedKeys);
        await persistUnconfirmedCreationKeys(nextUnconfirmedKeys);
        await showToast({
          style: Toast.Style.Failure,
          title:
            successCount > 0
              ? `Creation outcome unknown (${successCount} confirmed, ${unknownOutcomes.length} unconfirmed)`
              : "Creation outcome unknown",
          message: `${unknownOutcomes[0].message}${
            failures.length > 0 ? ` ${failures.length} definite failure(s) also remain.` : ""
          }`,
        });
        return;
      }

      if (successCount === 0) {
        const nextRetrySnapshot = buildBatchRetrySnapshot(retryableOutcomes.map((outcome) => outcome.item));
        setRetrySnapshot(nextRetrySnapshot);
        setSentence(nextRetrySnapshot.sentence);
        await showToast({
          style: Toast.Style.Failure,
          title: values.targetType === "reminder" ? "Reminder creation failed" : "Event creation failed",
          message: failures[0]?.message ?? "No items were created.",
        });
        return;
      }

      if (failures.length > 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: `Partial success (${successCount} succeeded, ${failures.length} failed)`,
          message: failures[0].message,
        });
        const nextRetrySnapshot = buildBatchRetrySnapshot(failures.map((failure) => failure.item));
        setRetrySnapshot(nextRetrySnapshot);
        setSentence(nextRetrySnapshot.sentence);
      } else {
        const baseTitle =
          values.targetType === "reminder" ? `Reminder created (${successCount})` : `Event created (${successCount})`;
        await showToast({
          style: Toast.Style.Success,
          title: openCalendarFailedMessage ? `${baseTitle}, failed to open Calendar` : baseTitle,
          message: openCalendarFailedMessage,
        });
      }

      if (failures.length === 0) {
        setRetrySnapshot(undefined);
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
    ? batchIntent === "deadline"
      ? "reminder"
      : batchIntent === "event"
        ? "calendar"
        : undefined
    : undefined;
  const parseStatusText = buildParseStatusText({
    sentence,
    parsedBatch,
    parseResult,
  });
  const parsedCount = parsedBatch.items.length;
  const isRecurringPreview = hasRecurringItems;
  const shouldShowRecurrenceOptions = targetType === "calendar" && isRecurringPreview;

  const handleSentenceChange = useCallback((value: string) => {
    setSentence(value);
    setIsTargetManuallyOverridden(false);
  }, []);

  return (
    <Form
      isLoading={
        isSubmitting ||
        !hasLoadedPreferences ||
        (targetType === "calendar" ? isLoadingCalendars : isLoadingReminderLists)
      }
      actions={
        <ActionPanel>
          {targetType === "reminder" ? (
            <Action.SubmitForm<FormValues>
              icon={Icon.Bell}
              title={parsedCount > 1 ? `Create ${parsedCount} Reminders` : "Create Reminder"}
              onSubmit={(values) => handleSubmit(values, { openCalendarAfterCreate: false })}
            />
          ) : (
            <>
              <Action.SubmitForm<FormValues>
                icon={Icon.Calendar}
                title={parsedCount > 1 ? `Create ${parsedCount} Calendar Events` : "Create Calendar Event"}
                onSubmit={(values) => handleSubmit(values, { openCalendarAfterCreate: false })}
              />
              <Action.SubmitForm<FormValues>
                icon={Icon.AppWindow}
                title={parsedCount > 1 ? `Create ${parsedCount} Events and Open Calendar` : "Create and Open Calendar"}
                onSubmit={(values) => handleSubmit(values, { openCalendarAfterCreate: true })}
              />
            </>
          )}
          <Action
            icon={Icon.ArrowClockwise}
            title="Refresh Lists"
            onAction={() => {
              if (targetType === "calendar") {
                void loadCalendars();
              } else {
                void loadReminderLists();
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="sentence"
        title="Schedule Sentence"
        placeholder={`e.g. ${KOREAN_INPUT_EXAMPLE}`}
        info={`Parses Korean natural language, up to ${MAX_BATCH_ITEMS} items per submission`}
        value={sentence}
        onChange={handleSentenceChange}
      />

      <Form.Description title="Parsing Status" text={parseStatusText} />
      {parsedPreview && (
        <Form.Description title="Parsing Summary" text={formatPreviewSummary(parsedPreview, previewLocation)} />
      )}
      {parsedBatch.isBatch && parsedBatch.items.length > 0 && (
        <Form.Description title="Batch Preview" text={formatBatchPreview(parsedBatch.items)} />
      )}
      {parsedBatch.errors.length > 0 && (
        <Form.Description title="Parsing Errors" text={formatBatchErrors(parsedBatch.errors)} />
      )}
      {recommendedTargetType && (
        <Form.Description
          title="Recommended Target"
          text={
            isTargetManuallyOverridden
              ? `${recommendedTargetType === "reminder" ? "Reminder Item" : "Apple Calendar Event"} (manual selection kept)`
              : `${recommendedTargetType === "reminder" ? "Reminder Item" : "Apple Calendar Event"} (automatically selected)`
          }
        />
      )}

      <Form.TextField
        id="location"
        title="Location (Optional)"
        placeholder="e.g. Gangnam Station Exit 1"
        info="A manual location overrides the location parsed from the sentence"
        value={location}
        onChange={setLocation}
      />

      <Form.Dropdown id="targetType" title="Creation Target" value={targetType} onChange={handleTargetTypeChange}>
        <Form.Dropdown.Item value="calendar" title="Apple Calendar Event" />
        <Form.Dropdown.Item value="reminder" title="Reminder Item" />
      </Form.Dropdown>

      {targetType === "calendar" ? (
        <Form.Dropdown
          id="calendarId"
          title="Calendar"
          info="Select the calendar where events will be created"
          value={calendarId}
          onChange={handleCalendarChange}
        >
          {isLoadingCalendars ? (
            <Form.Dropdown.Item value="" title="Loading Calendars..." />
          ) : calendars.length > 0 ? (
            <>
              {!calendarId && <Form.Dropdown.Item value="" title="Select a Calendar" />}
              {calendars.map((calendar) => (
                <Form.Dropdown.Item
                  key={calendar.id}
                  value={calendar.id}
                  title={calendar.isDefault ? `${calendar.title} (Default)` : calendar.title}
                  keywords={[calendar.sourceTitle]}
                />
              ))}
            </>
          ) : (
            <Form.Dropdown.Item value="" title="No Writable Calendars" />
          )}
        </Form.Dropdown>
      ) : (
        <Form.Dropdown
          id="reminderListId"
          title="Reminder List"
          info="Select the list where reminders will be created"
          value={reminderListId}
          onChange={handleReminderListChange}
        >
          {isLoadingReminderLists ? (
            <Form.Dropdown.Item value="" title="Loading Reminder Lists..." />
          ) : reminderLists.length > 0 ? (
            <>
              {!reminderListId && <Form.Dropdown.Item value="" title="Select a Reminder List" />}
              {reminderLists.map((reminderList) => (
                <Form.Dropdown.Item
                  key={reminderList.id}
                  value={reminderList.id}
                  title={reminderList.isDefault ? `${reminderList.title} (Default)` : reminderList.title}
                  keywords={[reminderList.sourceTitle]}
                />
              ))}
            </>
          ) : (
            <Form.Dropdown.Item value="" title="No Writable Reminder Lists" />
          )}
        </Form.Dropdown>
      )}

      {isRecurringPreview && (
        <Form.Description
          title="Recurrence Detected"
          text={
            targetType === "calendar"
              ? "Recurring schedules are created in Apple Calendar. Choose an occurrence count or end date."
              : "Recurring schedules can currently be created only as Apple Calendar events."
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
            <Form.Dropdown.Item value="count" title="After Occurrence Count" />
            <Form.Dropdown.Item value="until" title="On End Date" />
          </Form.Dropdown>

          {recurrenceEndType === "count" ? (
            <Form.TextField
              id="recurrenceCount"
              title="Occurrence Count"
              info={`Between 1 and ${MAX_RECURRENCE_COUNT}`}
              value={recurrenceCount}
              onChange={handleRecurrenceCountChange}
            />
          ) : (
            <Form.DatePicker
              id="recurrenceUntil"
              title="Recurrence End Date"
              info="Inclusive, on or after the start date and within 1 year"
              type={Form.DatePicker.Type.Date}
              min={recurrenceDateWindow?.min}
              max={recurrenceDateWindow?.max}
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

function buildParseStatusText({
  sentence,
  parsedBatch,
  parseResult,
}: {
  sentence: string;
  parsedBatch: ReturnType<typeof parseKoreanScheduleBatchWithRetrySnapshot>;
  parseResult: ReturnType<typeof firstBatchParseResult>;
}): string {
  if (!sentence.trim()) {
    return "Enter a sentence to see a preview.";
  }

  if (parsedBatch.tooManyItems) {
    return `You can create up to ${MAX_BATCH_ITEMS} items at once.`;
  }

  if (parsedBatch.items.length > 0 && parsedBatch.errors.length > 0) {
    return `Partial parse success (${parsedBatch.items.length} succeeded, ${parsedBatch.errors.length} failed)`;
  }

  if (summarizeBatchIntent(parsedBatch.items) === "mixed") {
    return "Calendar events and Reminder items must be submitted separately.";
  }

  if (parseResult?.ok) {
    return parsedBatch.isBatch ? `${parsedBatch.items.length} items ready to create` : "Ready to create";
  }

  if (parseResult && !parseResult.ok) {
    return `Error: ${parseResult.error}`;
  }

  return "No parse result.";
}

function summarizeBatchIntent(items: ParsedBatchItem[]): ParsedSchedule["intent"] | "mixed" | undefined {
  const intents = new Set(items.map((item) => item.value.intent));
  if (intents.size === 0) {
    return undefined;
  }
  if (intents.size > 1) {
    return "mixed";
  }
  return intents.values().next().value;
}

function formatBatchPreview(items: ParsedBatchItem[]): string {
  return items
    .map((item, index) => {
      const recurrence = item.value.recurrence ? ` / Recurrence: ${formatRecurrence(item.value.recurrence)}` : "";
      const inherited = item.inheritedDate ? " (inherited date)" : "";
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
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const weekday = weekdays[recurrence.weekday ?? 0];
    return `Weekly on ${weekday}`;
  }
  return `Monthly on day ${recurrence.dayOfMonth ?? 1}`;
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

function dateOnlyTimestamp(value: Date): number {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

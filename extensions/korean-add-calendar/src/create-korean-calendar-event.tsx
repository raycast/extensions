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
        title: "캘린더 선택 필요",
        message: "등록할 캘린더를 먼저 선택해 주세요.",
      });
      return;
    }

    if (values.targetType === "reminder" && !values.reminderListId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "미리알림 폴더 선택 필요",
        message: "등록할 미리알림 폴더를 먼저 선택해 주세요.",
      });
      return;
    }

    const submitBatch = parseKoreanScheduleBatch(values.sentence);
    if (submitBatch.tooManyItems) {
      await showToast({
        style: Toast.Style.Failure,
        title: "문장 분해 제한",
        message: `한 번에 최대 ${MAX_BATCH_ITEMS}개 문장만 등록할 수 있습니다.`,
      });
      return;
    }

    if (submitBatch.items.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "파싱 실패",
        message: submitBatch.errors[0]?.error ?? "일정 문장을 인식하지 못했습니다.",
      });
      return;
    }

    if (values.targetType === "reminder" && submitBatch.items.some((item) => item.value.recurrence)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "반복 일정 제한",
        message: "반복 일정은 현재 Apple Calendar 일정으로만 등록할 수 있습니다.",
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
          title: "일정 등록 실패",
          message: failures[0] ?? "등록된 항목이 없습니다.",
        });
        return;
      }

      if (failures.length > 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: `부분 성공 (${successCount}건 성공, ${failures.length}건 실패)`,
          message: failures[0],
        });
      } else {
        const baseTitle =
          values.targetType === "reminder"
            ? `미리알림 등록 완료 (${successCount}건)`
            : `일정 등록 완료 (${successCount}건)`;
        await showToast({
          style: Toast.Style.Success,
          title: openCalendarFailedMessage ? `${baseTitle}, 캘린더 열기 실패` : baseTitle,
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
              title={parsedCount > 1 ? `미리알림에 등록 (${parsedCount}건)` : "미리알림에 등록"}
              onSubmit={(values) => handleSubmit(values, { openCalendarAfterCreate: false })}
            />
          ) : (
            <>
              <Action.SubmitForm<FormValues>
                icon={Icon.Calendar}
                title={parsedCount > 1 ? `Apple Calendar에 등록 (${parsedCount}건)` : "Apple Calendar에 등록"}
                onSubmit={(values) => handleSubmit(values, { openCalendarAfterCreate: false })}
              />
              <Action.SubmitForm<FormValues>
                icon={Icon.AppWindow}
                title={parsedCount > 1 ? `등록 후 캘린더 열기 (${parsedCount}건)` : "등록 후 캘린더 열기"}
                onSubmit={(values) => handleSubmit(values, { openCalendarAfterCreate: true })}
              />
            </>
          )}
          <Action
            icon={Icon.ArrowClockwise}
            title="목록 새로고침"
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
        title="일정 문장"
        placeholder="예) 다음주 화요일 오후 3시 반에 강남에서 팀 미팅"
        info={`한국어 자연어 파싱 (복합 입력 최대 ${MAX_BATCH_ITEMS}건)`}
        value={sentence}
        onChange={handleSentenceChange}
      />

      <Form.Description title="파싱 상태" text={parseStatusText} />
      {parsedPreview && (
        <Form.Description title="파싱 요약" text={formatPreviewSummary(parsedPreview, previewLocation)} />
      )}
      {parsedBatch.isBatch && parsedBatch.items.length > 0 && (
        <Form.Description title="분해 미리보기" text={formatBatchPreview(parsedBatch.items)} />
      )}
      {parsedBatch.errors.length > 0 && (
        <Form.Description title="분해 오류" text={formatBatchErrors(parsedBatch.errors)} />
      )}
      {recommendedTargetType && (
        <Form.Description
          title="추천 대상"
          text={
            isTargetManuallyOverridden
              ? `${recommendedTargetType === "reminder" ? "미리알림 항목" : "Apple Calendar 일정"} (수동 선택 유지)`
              : `${recommendedTargetType === "reminder" ? "미리알림 항목" : "Apple Calendar 일정"} (자동 적용)`
          }
        />
      )}

      <Form.TextField
        id="location"
        title="장소 (선택)"
        placeholder="예) 강남역 1번 출구"
        info="입력하면 문장 파싱 장소보다 우선 적용됩니다"
        value={location}
        onChange={setLocation}
      />

      <Form.Dropdown id="targetType" title="등록 대상" value={targetType} onChange={handleTargetTypeChange}>
        <Form.Dropdown.Item value="calendar" title="Apple Calendar 일정" />
        <Form.Dropdown.Item value="reminder" title="미리알림 항목" />
      </Form.Dropdown>

      {targetType === "calendar" ? (
        <Form.Dropdown
          id="calendarId"
          title="캘린더"
          info="목록에서 등록할 캘린더를 선택하세요"
          value={calendarId}
          onChange={handleCalendarChange}
        >
          {isLoadingCalendars ? (
            <Form.Dropdown.Item value="" title="캘린더 목록 불러오는 중..." />
          ) : calendars.length > 0 ? (
            calendars.map((calendar) => (
              <Form.Dropdown.Item
                key={calendar.id}
                value={calendar.id}
                title={calendar.isDefault ? `${calendar.title} (기본)` : calendar.title}
                keywords={[calendar.sourceTitle]}
              />
            ))
          ) : (
            <Form.Dropdown.Item value="" title="선택 가능한 캘린더가 없습니다" />
          )}
        </Form.Dropdown>
      ) : (
        <Form.Dropdown
          id="reminderListId"
          title="미리알림 폴더"
          info="등록할 미리알림 폴더를 선택하세요"
          value={reminderListId}
          onChange={handleReminderListChange}
        >
          {isLoadingReminderLists ? (
            <Form.Dropdown.Item value="" title="미리알림 폴더 목록 불러오는 중..." />
          ) : reminderLists.length > 0 ? (
            reminderLists.map((reminderList) => (
              <Form.Dropdown.Item
                key={reminderList.id}
                value={reminderList.id}
                title={reminderList.isDefault ? `${reminderList.title} (기본)` : reminderList.title}
                keywords={[reminderList.sourceTitle]}
              />
            ))
          ) : (
            <Form.Dropdown.Item value="" title="선택 가능한 미리알림 폴더가 없습니다" />
          )}
        </Form.Dropdown>
      )}

      {isRecurringPreview && (
        <Form.Description
          title="반복 감지"
          text={
            targetType === "calendar"
              ? "반복 일정은 Apple Calendar로 등록됩니다. 종료 방식(횟수/종료일)을 선택해 주세요."
              : "반복 일정은 현재 Apple Calendar 일정으로만 등록할 수 있습니다."
          }
        />
      )}

      {shouldShowRecurrenceOptions && (
        <>
          <Form.Dropdown
            id="recurrenceEndType"
            title="반복 종료 방식"
            value={recurrenceEndType}
            onChange={handleRecurrenceEndTypeChange}
          >
            <Form.Dropdown.Item value="count" title="횟수로 종료" />
            <Form.Dropdown.Item value="until" title="종료일로 종료" />
          </Form.Dropdown>

          {recurrenceEndType === "count" ? (
            <Form.TextField
              id="recurrenceCount"
              title="반복 횟수"
              info={`1~${MAX_RECURRENCE_COUNT}회`}
              value={recurrenceCount}
              onChange={handleRecurrenceCountChange}
            />
          ) : (
            <Form.DatePicker
              id="recurrenceUntil"
              title="반복 종료일"
              info="시작일 이후, 최대 1년 이내"
              value={recurrenceUntil}
              onChange={handleRecurrenceUntilChange}
            />
          )}
        </>
      )}

      {calendarLoadError && <Form.Description title="캘린더 오류" text={calendarLoadError} />}
      {reminderLoadError && <Form.Description title="미리알림 오류" text={reminderLoadError} />}
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
      return new Error(`반복 횟수는 1~${MAX_RECURRENCE_COUNT} 사이 값으로 입력해 주세요.`);
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
    return new Error("반복 종료일을 선택해 주세요.");
  }

  if (until.getTime() < parsed.start.getTime()) {
    return new Error("반복 종료일은 시작일 이후여야 합니다.");
  }

  const oneYearAfterStart = new Date(parsed.start);
  oneYearAfterStart.setFullYear(oneYearAfterStart.getFullYear() + 1);
  if (until.getTime() > oneYearAfterStart.getTime()) {
    return new Error("반복 종료일은 시작일 기준 1년 이내로 설정해 주세요.");
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
    return "문장을 입력하면 미리보기를 표시합니다.";
  }

  if (parsedBatch.tooManyItems) {
    return `한 번에 최대 ${MAX_BATCH_ITEMS}개 문장까지 지원합니다.`;
  }

  if (parsedBatch.items.length > 0 && parsedBatch.errors.length > 0) {
    return `부분 해석 성공 (${parsedBatch.items.length}건 성공, ${parsedBatch.errors.length}건 실패)`;
  }

  if (parseResult?.ok) {
    return parsedBatch.isBatch ? `${parsedBatch.items.length}건 등록 가능` : "등록 가능";
  }

  if (parseResult && !parseResult.ok) {
    return `오류: ${parseResult.error}`;
  }

  return "파싱 결과가 없습니다.";
}

function formatBatchPreview(items: ParsedBatchItem[]): string {
  return items
    .map((item, index) => {
      const recurrence = item.value.recurrence ? ` / 반복:${formatRecurrence(item.value.recurrence)}` : "";
      const inherited = item.inheritedDate ? " (날짜 상속)" : "";
      return `${index + 1}. ${item.value.title} - ${formatDate(item.value.start, item.value.allDay)}${recurrence}${inherited}`;
    })
    .join(" | ");
}

function formatBatchErrors(errors: ParsedBatchError[]): string {
  return errors.map((error, index) => `${index + 1}. [${error.input}] ${error.error}`).join(" | ");
}

function formatPreviewSummary(parsedPreview: ParsedSchedule, location: string | undefined): string {
  const typeText = parsedPreview.intent === "deadline" ? "마감" : "일정";
  const timeLabel = parsedPreview.intent === "deadline" ? "마감" : "시간";
  const timeText =
    parsedPreview.intent === "deadline"
      ? formatDate(parsedPreview.start, parsedPreview.allDay)
      : parsedPreview.allDay
        ? `${formatDate(parsedPreview.start, true)} (종일)`
        : `${formatDate(parsedPreview.start, false)} ~ ${formatDate(parsedPreview.end, false)}`;
  const locationText = location || "(없음)";
  const recurrenceText = parsedPreview.recurrence ? ` | 반복: ${formatRecurrence(parsedPreview.recurrence)}` : "";
  return `유형: ${typeText} | 제목: ${parsedPreview.title} | ${timeLabel}: ${timeText} | 장소: ${locationText}${recurrenceText}`;
}

function formatRecurrence(recurrence: ParsedRecurrence): string {
  if (recurrence.frequency === "daily") {
    return "매일";
  }
  if (recurrence.frequency === "weekly") {
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
    const weekday = weekdays[recurrence.weekday ?? 0];
    return `매주 ${weekday}`;
  }
  return `매월 ${recurrence.dayOfMonth ?? 1}일`;
}

function formatDate(value: Date, allDay: boolean): string {
  if (allDay) {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    }).format(value);
  }

  return new Intl.DateTimeFormat("ko-KR", {
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

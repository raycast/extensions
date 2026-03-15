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

    if (!parseResult) {
      await showToast({
        style: Toast.Style.Failure,
        title: "일정 문장 필요",
        message: "일정 문장을 입력해 주세요.",
      });
      return;
    }

    if (!parseResult.ok) {
      await showToast({
        style: Toast.Style.Failure,
        title: "파싱 실패",
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
          title: "미리알림 등록 완료",
          message: `폴더: ${result.reminderListName}`,
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
          title: openCalendarFailedMessage ? "일정 등록 완료 (캘린더 열기 실패)" : "일정 등록 완료",
          message: openCalendarFailedMessage ? openCalendarFailedMessage : `캘린더: ${result.calendarName}`,
        });
      }

      setSentence("");
      setLocation("");
      setIsTargetManuallyOverridden(false);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "일정 등록 실패",
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
              title="미리알림에 등록"
              onSubmit={(values) => handleSubmit(values, { openCalendarAfterCreate: false })}
            />
          ) : (
            <>
              <Action.SubmitForm<FormValues>
                icon={Icon.Calendar}
                title="Apple Calendar에 등록"
                onSubmit={(values) => handleSubmit(values, { openCalendarAfterCreate: false })}
              />
              <Action.SubmitForm<FormValues>
                icon={Icon.AppWindow}
                title="등록 후 캘린더 열기"
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
        info="한국어 자연어 파싱"
        value={sentence}
        onChange={handleSentenceChange}
      />

      <Form.Description
        title="파싱 상태"
        text={
          !parseResult
            ? "문장을 입력하면 미리보기를 표시합니다."
            : parseResult.ok
              ? "등록 가능"
              : `오류: ${parseResult.error}`
        }
      />
      {parsedPreview && (
        <Form.Description title="파싱 요약" text={formatPreviewSummary(parsedPreview, previewLocation)} />
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

      {calendarLoadError && <Form.Description title="캘린더 오류" text={calendarLoadError} />}
      {reminderLoadError && <Form.Description title="미리알림 오류" text={reminderLoadError} />}
    </Form>
  );
}

function formatPreviewSummary(
  parsedPreview: { title: string; start: Date; end: Date; allDay: boolean; intent: "event" | "deadline" },
  location: string | undefined,
): string {
  const typeText = parsedPreview.intent === "deadline" ? "마감" : "일정";
  const timeLabel = parsedPreview.intent === "deadline" ? "마감" : "시간";
  const timeText =
    parsedPreview.intent === "deadline"
      ? formatDate(parsedPreview.start, parsedPreview.allDay)
      : parsedPreview.allDay
        ? `${formatDate(parsedPreview.start, true)} (종일)`
        : `${formatDate(parsedPreview.start, false)} ~ ${formatDate(parsedPreview.end, false)}`;
  const locationText = location || "(없음)";
  return `유형: ${typeText} | 제목: ${parsedPreview.title} | ${timeLabel}: ${timeText} | 장소: ${locationText}`;
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

import { Action, ActionPanel, Form, Icon, LocalStorage, Toast, showToast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createAppleCalendarEvent,
  listWritableCalendars,
  openCalendarAtDate,
  WritableCalendar,
} from "./lib/apple-calendar";
import { parseKoreanSchedule } from "./lib/parse-korean-schedule";

interface FormValues {
  sentence: string;
  calendarId: string;
  location?: string;
}

const CALENDAR_ID_STORAGE_KEY = "selectedCalendarId";

export default function Command() {
  const [sentence, setSentence] = useState("");
  const [location, setLocation] = useState("");
  const [calendarId, setCalendarId] = useState("");
  const [calendars, setCalendars] = useState<WritableCalendar[]>([]);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(true);
  const [calendarLoadError, setCalendarLoadError] = useState<string | undefined>();
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

  const handleCalendarChange = useCallback(
    (value: string) => {
      setCalendarId(value);
      persistCalendarId(value);
    },
    [persistCalendarId],
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

  useEffect(() => {
    void loadCalendars();
  }, [loadCalendars]);

  async function handleSubmit(values: FormValues, options: { openCalendarAfterCreate: boolean }) {
    if (!values.calendarId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "캘린더 선택 필요",
        message: "등록할 캘린더를 먼저 선택해 주세요.",
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
      const event = {
        ...parseResult.value,
        location: manualLocation || parseResult.value.location,
      };

      const result = await createAppleCalendarEvent(event, {
        preferredCalendarIdentifier: values.calendarId,
      });

      let openCalendarFailedMessage: string | undefined;
      if (options.openCalendarAfterCreate) {
        try {
          await openCalendarAtDate(event.start);
        } catch (error) {
          openCalendarFailedMessage = error instanceof Error ? error.message : String(error);
        }
      }

      await showToast({
        style: Toast.Style.Success,
        title: openCalendarFailedMessage ? "일정 등록 완료 (캘린더 열기 실패)" : "일정 등록 완료",
        message: openCalendarFailedMessage ? openCalendarFailedMessage : `캘린더: ${result.calendarName}`,
      });

      setSentence("");
      setLocation("");
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

  return (
    <Form
      isLoading={isSubmitting || isLoadingCalendars}
      actions={
        <ActionPanel>
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
          <Action icon={Icon.ArrowClockwise} title="캘린더 목록 새로고침" onAction={() => void loadCalendars()} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="sentence"
        title="일정 문장"
        placeholder="예) 다음주 화요일 오후 3시 반에 강남에서 팀 미팅"
        info="한국어 자연어 파싱"
        value={sentence}
        onChange={setSentence}
      />

      <Form.TextField
        id="location"
        title="장소 (선택)"
        placeholder="예) 강남역 1번 출구"
        info="입력하면 문장 파싱 장소보다 우선 적용됩니다"
        value={location}
        onChange={setLocation}
      />

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

      <Form.Separator />
      {calendarLoadError && <Form.Description title="캘린더 오류" text={calendarLoadError} />}
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
        <>
          <Form.Description title="제목" text={parsedPreview.title} />
          <Form.Description title="시작" text={formatDate(parsedPreview.start, parsedPreview.allDay)} />
          <Form.Description title="종료" text={formatDate(parsedPreview.end, parsedPreview.allDay)} />
          <Form.Description title="장소" text={previewLocation || "(없음)"} />
          <Form.Description title="유형" text={parsedPreview.allDay ? "종일" : "시간 지정"} />
        </>
      )}
    </Form>
  );
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

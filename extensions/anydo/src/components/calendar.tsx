import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useMemo, useState } from "react";

import { makeClient } from "../anydo/auth";
import { formatDueUi } from "../anydo/dates";
import { isoDay } from "../anydo/dates";
import { t } from "../anydo/i18n";
import { toPersianDigits } from "../anydo/jalali";
import { parseTaskText } from "../anydo/parse";
import type { AnyDoCalendar, AnyDoEvent } from "../anydo/types";
import { errorMessage } from "./feedback";
import { useAsync } from "./use-async";

/** Google holiday calendars are read-only; writing into them fails with a 400. */
function isWritable(calendar: AnyDoCalendar): boolean {
  return !calendar.id.includes("#holiday@");
}

function eventStart(event: AnyDoEvent): Date | null {
  const raw = event.start_time ?? event.start ?? null;
  if (!raw) return null;
  const parsed =
    raw.length === 10 ? new Date(`${raw}T00:00:00`) : new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function eventEnd(event: AnyDoEvent): Date | null {
  const raw = event.end_time ?? event.end ?? null;
  if (!raw) return null;
  const parsed =
    raw.length === 10 ? new Date(`${raw}T23:59:00`) : new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function clockOf(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** Today + tomorrow from the calendars the user connected inside Any.do. */
export function CalendarView({ onChanged }: { onChanged?: () => void }) {
  const { data, isLoading, error, revalidate } = useAsync(async () => {
    const client = makeClient();
    const calendars = await client.getConnectedCalendars();
    if (calendars.length === 0)
      return { calendars, events: [] as AnyDoEvent[] };
    const events = await client.getEvents(
      calendars.map((calendar) => calendar.id),
      new Date(),
      new Date(Date.now() + 2 * 86_400_000),
    );
    return { calendars, events };
  });

  const calendars = data?.calendars ?? [];
  const events = data?.events ?? [];
  const today = isoDay(new Date());

  const sections = useMemo(() => {
    const groups = new Map<string, AnyDoEvent[]>();
    for (const event of events) {
      const start = eventStart(event);
      const key = start ? isoDay(start) : "—";
      groups.set(key, [...(groups.get(key) ?? []), event]);
    }
    return [...groups.entries()].sort((left, right) =>
      left[0].localeCompare(right[0]),
    );
  }, [events]);

  if (calendars.length === 0 && !isLoading) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Calendar}
          title={t(
            "تقویمی به Any.do وصل نیست",
            "No calendar connected to Any.do",
          )}
          description={t(
            "برای دیدن جلسات، اول در Any.do یک تقویم (مثلاً گوگل) وصل کن.",
            "Connect a calendar (e.g. Google) inside Any.do first.",
          )}
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={t("تقویم و جلسات", "Calendar")}
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title={t("بارگذاری نشد", "Could not load")}
          description={error.message}
        />
      ) : null}
      {sections.map(([day, dayEvents]) => (
        <List.Section
          key={day}
          title={
            day === today
              ? t("امروز", "Today")
              : formatDueUi(new Date(`${day}T12:00:00`), false)
          }
          subtitle={toPersianDigits(dayEvents.length)}
        >
          {dayEvents.map((event, index) => {
            const start = eventStart(event);
            const end = eventEnd(event);
            return (
              <List.Item
                key={`${day}-${index}`}
                icon={Icon.Calendar}
                title={event.title ?? event.summary ?? t("رویداد", "Event")}
                subtitle={
                  start && end
                    ? `${clockOf(start)} – ${clockOf(end)}`
                    : undefined
                }
                accessories={[
                  ...(start &&
                  end &&
                  start.getHours() === 0 &&
                  start.getMinutes() === 0
                    ? [{ tag: { value: t("تمام‌روز", "All day") } }]
                    : [{ text: start ? toPersianDigits(clockOf(start)) : "" }]),
                  ...(event.location
                    ? [{ tag: { value: event.location } }]
                    : []),
                ]}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      title={t("کپی عنوان", "Copy title")}
                      content={event.title ?? ""}
                    />
                    <Action
                      title={t("تازه‌سازی", "Refresh")}
                      icon={Icon.ArrowClockwise}
                      onAction={revalidate}
                    />
                    <Action.Push
                      title={t("ساخت رویداد", "Create event")}
                      icon={Icon.Plus}
                      target={
                        <CreateEventForm
                          calendars={calendars}
                          onCreated={onChanged}
                        />
                      }
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
      <List.EmptyView
        icon={Icon.Calendar}
        title={t(
          "جلسه‌ای در ۴۸ ساعت آینده نیست",
          "Nothing in the next 48 hours",
        )}
        actions={
          <ActionPanel>
            <Action.Push
              title={t("ساخت رویداد", "Create event")}
              icon={Icon.Plus}
              target={
                <CreateEventForm calendars={calendars} onCreated={onChanged} />
              }
            />
            <Action
              title={t("تازه‌سازی", "Refresh")}
              icon={Icon.ArrowClockwise}
              onAction={revalidate}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

const DURATIONS: { title: string; minutes: number }[] = [
  { title: "۳۰ دقیقه", minutes: 30 },
  { title: "۱ ساعت", minutes: 60 },
  { title: "۲ ساعت", minutes: 120 },
  { title: "تمام روز", minutes: 0 },
];

/** Creates an event; free-form text can carry the date («جلسه فردا ۱۰ صبح»). */
export function CreateEventForm({
  calendars,
  onCreated,
}: {
  calendars: AnyDoCalendar[];
  onCreated?: () => void;
}) {
  const { pop } = useNavigation();
  const writable = calendars.filter(isWritable);
  const [title, setTitle] = useState("");
  const parsed = useMemo(
    () => (title.trim() ? parseTaskText(title) : null),
    [title],
  );
  const [start, setStart] = useState<Date>(
    () => new Date(Date.now() + 3_600_000),
  );
  const [location, setLocation] = useState("");

  const effectiveStart = parsed?.date ?? start;
  const startLocal = `${effectiveStart.getFullYear()}-${String(effectiveStart.getMonth() + 1).padStart(2, "0")}-${String(
    effectiveStart.getDate(),
  ).padStart(
    2,
    "0",
  )}T${String(effectiveStart.getHours()).padStart(2, "0")}:${String(effectiveStart.getMinutes()).padStart(2, "0")}:00`;

  async function handleSubmit(values: {
    title: string;
    calendar: string;
    duration: string;
    location: string;
  }) {
    const parsedText = parseTaskText(values.title);
    const eventTitle = parsedText.title.trim() || values.title.trim();
    const begin = parsedText.date ?? start;
    const duration = Number(values.duration);

    const end =
      duration === 0
        ? new Date(
            begin.getFullYear(),
            begin.getMonth(),
            begin.getDate(),
            23,
            59,
            0,
          )
        : new Date(begin.getTime() + duration * 60_000);

    const pad = (value: number) => String(value).padStart(2, "0");
    const iso = (date: Date) =>
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: t("در حال ساخت رویداد…", "Creating event…"),
    });
    try {
      await makeClient().createEvent(values.calendar, {
        title: eventTitle,
        startTime: duration === 0 ? isoDay(begin) : iso(begin),
        endTime: duration === 0 ? isoDay(end) : iso(end),
        location: values.location.trim() || undefined,
      });
      toast.style = Toast.Style.Success;
      toast.title = t("رویداد ساخته شد", "Event created");
      toast.message = `${eventTitle} · ${formatDueUi(begin, duration !== 0)}`;
      onCreated?.();
      await pop();
    } catch (caught) {
      toast.style = Toast.Style.Failure;
      toast.title = t("ساخت رویداد ناموفق بود", "Could not create the event");
      toast.message = errorMessage(caught);
    }
  }

  return (
    <Form
      navigationTitle={t("ساخت رویداد", "Create event")}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={t("ساخت رویداد", "Create event")}
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title={t("عنوان", "Title")}
        placeholder={t(
          "جلسه با تیم فردا ساعت ۱۰",
          "Team meeting tomorrow at 10",
        )}
        value={title}
        onChange={setTitle}
        autoFocus
      />
      <Form.Description
        title={t("شروع", "Starts")}
        text={`${formatDueUi(effectiveStart, true)}${parsed?.date ? ` — ${t("از متن", "from text")}` : ""}`}
      />
      <Form.DatePicker
        id="startPicker"
        title={t(
          "تاریخ شروع (اگر متن تاریخ ندارد)",
          "Start (when the text has no date)",
        )}
        type={Form.DatePicker.Type.DateTime}
        value={start}
        onChange={(value) => setStart(value ?? new Date())}
      />
      <Form.Dropdown
        id="duration"
        title={t("مدت", "Duration")}
        defaultValue="60"
      >
        {DURATIONS.map((option) => (
          <Form.Dropdown.Item
            key={option.minutes}
            value={String(option.minutes)}
            title={option.title}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="calendar"
        title={t("تقویم", "Calendar")}
        defaultValue={writable[0]?.id ?? calendars[0]?.id ?? ""}
      >
        {writable.map((calendar) => (
          <Form.Dropdown.Item
            key={calendar.id}
            value={calendar.id}
            title={calendar.name}
          />
        ))}
        {calendars
          .filter((calendar) => !isWritable(calendar))
          .map((calendar) => (
            <Form.Dropdown.Item
              key={calendar.id}
              value={calendar.id}
              title={`${calendar.name} (${t("فقط خواندنی", "read-only")})`}
            />
          ))}
      </Form.Dropdown>
      <Form.TextField
        id="location"
        title={t("مکان", "Location")}
        value={location}
        onChange={setLocation}
        placeholder={t("اختیاری", "optional")}
      />
      <Form.Description text={startLocal} />
    </Form>
  );
}

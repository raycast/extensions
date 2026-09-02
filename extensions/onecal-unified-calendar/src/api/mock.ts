import { OneCalCalendar, OneCalEvent, UnifiedCalendarData } from "./onecal";

/**
 * スクリーンショット撮影・デモ用のダミーデータ。
 * コマンド引数に `demo` を渡すと実データの代わりにこれが表示される（README参照）。
 * 「進行中」「5分以内に開始」「終日」「クローン」など、UIの全状態が写るよう現在時刻から相対で組み立てる。
 */
export function buildMockData(): UnifiedCalendarData {
  const calendars: OneCalCalendar[] = [
    {
      id: "work",
      name: "Work",
      provider: "google",
      accountEmail: "work@example.com",
    },
    {
      id: "personal",
      name: "Personal",
      provider: "google",
      accountEmail: "personal@example.com",
    },
    {
      id: "team",
      name: "Team",
      provider: "outlook",
      accountEmail: "team@example.com",
    },
  ];

  const now = Date.now();
  const minutes = 60 * 1000;
  const at = (offsetMinutes: number) =>
    new Date(now + offsetMinutes * minutes).toISOString();
  const dayStr = (offsetDays: number) => {
    const d = new Date(now + offsetDays * 24 * 60 * minutes);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const events: OneCalEvent[] = [
    {
      id: "demo-1",
      calendarId: "work",
      calendarName: "Work",
      title: "Product Sync",
      start: at(-20),
      end: at(25),
      allDay: false,
      meetingUrl: "https://meet.google.com/abc-defg-hij",
      isClone: false,
    },
    {
      id: "demo-2",
      calendarId: "team",
      calendarName: "Team",
      title: "1on1 Meeting",
      start: at(4),
      end: at(34),
      allDay: false,
      meetingUrl: "https://meet.google.com/klm-nopq-rst",
      isClone: false,
    },
    {
      id: "demo-3",
      calendarId: "work",
      calendarName: "Work",
      title: "Design Review",
      start: at(120),
      end: at(180),
      allDay: false,
      meetingUrl: "https://zoom.us/j/123456789",
      isClone: false,
    },
    {
      id: "demo-4",
      calendarId: "work",
      calendarName: "Work",
      title: "Focus Block",
      start: at(240),
      end: at(360),
      allDay: false,
      isClone: false,
    },
    {
      id: "demo-5",
      calendarId: "personal",
      calendarName: "Personal",
      title: "Gym",
      start: at(600),
      end: at(660),
      allDay: false,
      isClone: false,
    },
    {
      id: "demo-6",
      calendarId: "team",
      calendarName: "Team",
      title: "Quarterly Planning Review",
      start: `${dayStr(1)}T10:00:00+09:00`,
      end: `${dayStr(1)}T11:30:00+09:00`,
      allDay: false,
      meetingUrl: "https://teams.microsoft.com/l/meetup-join/demo",
      isClone: false,
    },
    {
      id: "demo-7",
      calendarId: "personal",
      calendarName: "Personal",
      title: "Dentist Appointment",
      start: `${dayStr(1)}T15:00:00+09:00`,
      end: `${dayStr(1)}T16:00:00+09:00`,
      allDay: false,
      location: "Dental Clinic",
      isClone: false,
    },
    {
      id: "demo-8",
      calendarId: "work",
      calendarName: "Work",
      title: "Team Offsite",
      start: dayStr(2),
      allDay: true,
      isClone: false,
    },
    // クローン（OneCal Syncの複製。既定では非表示になり、トグルで件数が見える）
    {
      id: "demo-1-clone",
      calendarId: "personal",
      calendarName: "Personal",
      title: "Product Sync",
      start: at(-20),
      end: at(25),
      allDay: false,
      isClone: true,
    },
    {
      id: "demo-3-clone",
      calendarId: "personal",
      calendarName: "Personal",
      title: "Design Review",
      start: at(120),
      end: at(180),
      allDay: false,
      isClone: true,
    },
  ];

  events.sort((a, b) => a.start.localeCompare(b.start));
  return {
    calendars,
    events,
    toolNames: { listCalendars: "mock", getEvents: "mock" },
    cloneFlagPresent: true,
  };
}

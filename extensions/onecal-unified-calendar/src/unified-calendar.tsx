import {
  Action,
  ActionPanel,
  Color,
  environment,
  getPreferenceValues,
  Icon,
  LaunchProps,
  List,
  Keyboard,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { authorize, logout } from "./api/oauth";
import { connectMcp } from "./api/mcp";
import { fetchUnifiedCalendar, filterClones, OneCalEvent } from "./api/onecal";
import { buildMockData } from "./api/mock";

const CACHE_VERSION = "v2";

export default function UnifiedCalendar(
  props: LaunchProps<{ arguments: Arguments.UnifiedCalendar }>,
) {
  const preferences = getPreferenceValues<Preferences.UnifiedCalendar>();
  const [hideClones, setHideClones] = useState(preferences.hideClones);
  const [calendarFilter, setCalendarFilter] = useState<string>("all");

  // 開発モード限定: 引数に demo を渡すとスクリーンショット撮影用のダミーデータを表示する（README参照）
  const isDemo = environment.isDevelopment && props.arguments.date === "demo";
  const rangeStart = parseStartDate(isDemo ? undefined : props.arguments.date);
  // 暦日で加算する（固定24時間×日数だとDST切替日に取得範囲が前後1時間ずれるため）
  const rangeEnd = new Date(rangeStart);
  rangeEnd.setDate(
    rangeEnd.getDate() + parseInt(preferences.daysAhead || "7", 10),
  );

  // useCachedPromiseのstale-while-revalidateで前回結果を即表示し、裏で再取得して差し替える。
  // キャッシュキーは表示範囲（開始日・日数）＋接続先クライアント（アカウント切替時に混ざらないよう）ごと。
  // CACHE_VERSIONはUnifiedCalendarDataのスキーマ変更時に上げて、旧形式のキャッシュを無効化する。
  const { isLoading, data, error, revalidate } = useCachedPromise(
    (
      _version: string,
      _clientId: string,
      startIso: string,
      endIso: string,
      demo: boolean,
    ) =>
      demo
        ? Promise.resolve(buildMockData())
        : fetchWithConnection(new Date(startIso), new Date(endIso)),
    [
      CACHE_VERSION,
      preferences.clientId,
      rangeStart.toISOString(),
      rangeEnd.toISOString(),
      isDemo,
    ],
    { keepPreviousData: true },
  );

  const visibleEvents = (() => {
    if (!data) {
      return [];
    }
    let events = hideClones
      ? filterClones(data.events, data.cloneFlagPresent)
      : data.events;
    if (calendarFilter !== "all") {
      events = events.filter((e) => e.calendarId === calendarFilter);
    }
    return events;
  })();

  const eventsByDay = groupByDay(visibleEvents);
  const hiddenCloneCount = data
    ? data.events.length -
      filterClones(data.events, data.cloneFlagPresent).length
    : 0;
  const featuredMeetings = findFeaturedMeetings(visibleEvents);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search events…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by calendar"
          value={calendarFilter}
          onChange={setCalendarFilter}
        >
          <List.Dropdown.Item title="All Calendars" value="all" />
          {data?.calendars.map((calendar) => (
            <List.Dropdown.Item
              key={calendar.id}
              title={calendar.name}
              value={calendar.id}
            />
          ))}
        </List.Dropdown>
      }
    >
      {error && (
        <List.EmptyView
          icon={Icon.Warning}
          title="Failed to Load"
          description={String(error)}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
              <Action
                title="Reconnect Account"
                icon={Icon.Logout}
                onAction={() => logout().then(revalidate)}
              />
            </ActionPanel>
          }
        />
      )}

      {error && data && (
        // stale-while-revalidateで前回キャッシュを表示中に再取得が失敗したケース。
        // EmptyViewは項目があると表示されないため、古い予定が最新に見えないよう警告行を常に出す。
        <List.Section title="⚠️ Update Error">
          <List.Item
            icon={{ source: Icon.Warning, tintColor: Color.Red }}
            title="Failed to Fetch Latest Events"
            subtitle="Showing previously cached data"
            accessories={[{ text: String(error).slice(0, 80) }]}
            actions={
              <ActionPanel>
                <Action
                  title="Retry"
                  icon={Icon.ArrowClockwise}
                  onAction={revalidate}
                />
                <Action
                  title="Reconnect Account"
                  icon={Icon.Logout}
                  onAction={() => logout().then(revalidate)}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {featuredMeetings.length > 0 && (
        <List.Section title="⏭️ Up Next">
          {featuredMeetings.map(({ event, ongoing }) => (
            <FeaturedMeetingItem
              key={`featured-${event.calendarId}-${event.id}-${event.start}`}
              event={event}
              ongoing={ongoing}
              onRefresh={revalidate}
            />
          ))}
        </List.Section>
      )}

      {[...eventsByDay.entries()].map(([day, events]) => (
        <List.Section
          key={day}
          title={formatDayHeader(day)}
          subtitle={`${events.length} ${events.length === 1 ? "event" : "events"}`}
        >
          {events.map((event) => (
            <EventItem
              key={`${event.calendarId}-${event.id}-${event.start}`}
              event={event}
              hideClones={hideClones}
              hiddenCloneCount={hiddenCloneCount}
              onToggleClones={() => setHideClones((v) => !v)}
              onRefresh={revalidate}
            />
          ))}
        </List.Section>
      ))}

      {!isLoading && !error && visibleEvents.length === 0 && (
        <List.EmptyView
          icon={Icon.Calendar}
          title="No Events"
          description={`${formatLocalDate(rangeStart)} 〜 ${formatLocalDate(inclusiveEnd(rangeEnd))}${
            hideClones && hiddenCloneCount > 0
              ? ` (${hiddenCloneCount} clones hidden)`
              : ""
          }`}
          actions={
            <ActionPanel>
              <Action
                title={
                  hideClones
                    ? `Show Clones (${hiddenCloneCount} Hidden)`
                    : "Hide Clones"
                }
                icon={Icon.EyeDisabled}
                shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
                onAction={() => setHideClones((v) => !v)}
              />
              <Action
                title="Reload"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

function FeaturedMeetingItem(props: {
  event: OneCalEvent;
  ongoing: boolean;
  onRefresh: () => void;
}) {
  const { event, ongoing } = props;
  return (
    <List.Item
      icon={{
        source: event.meetingUrl ? Icon.Video : Icon.Calendar,
        tintColor: ongoing ? Color.Red : Color.Yellow,
      }}
      title={event.title}
      subtitle={formatRelative(event.start, event.end)}
      accessories={[
        ...(event.calendarName
          ? [{ tag: { value: event.calendarName, color: Color.Blue } }]
          : []),
        { text: formatTimeRange(event.start, event.end) },
      ]}
      actions={
        <ActionPanel>
          {event.meetingUrl && (
            <Action.OpenInBrowser
              title="Join Meeting"
              icon={Icon.Video}
              url={event.meetingUrl}
            />
          )}
          <Action.OpenInBrowser
            title="Open in OneCal Calendar View"
            url={`https://app.onecal.io/calendar-view?date=${localDayOf(event.start)}`}
          />
          {event.meetingUrl && (
            <Action.CopyToClipboard
              title="Copy Meeting URL"
              content={event.meetingUrl}
            />
          )}
          <Action
            title="Reload"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={props.onRefresh}
          />
        </ActionPanel>
      }
    />
  );
}

function EventItem(props: {
  event: OneCalEvent;
  hideClones: boolean;
  hiddenCloneCount: number;
  onToggleClones: () => void;
  onRefresh: () => void;
}) {
  const { event } = props;
  const accessories: List.Item.Accessory[] = [];
  if (event.calendarName) {
    accessories.push({ tag: { value: event.calendarName, color: Color.Blue } });
  }
  if (event.isClone) {
    accessories.push({ tag: { value: "clone", color: Color.Orange } });
  }
  accessories.push({
    text: event.allDay ? "All Day" : formatTimeRange(event.start, event.end),
  });

  const dayForUrl = localDayOf(event.start);

  return (
    <List.Item
      icon={{ source: Icon.Circle, tintColor: Color.Green }}
      title={event.title}
      subtitle={event.location}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in OneCal Calendar View"
            url={`https://app.onecal.io/calendar-view?date=${dayForUrl}`}
          />
          {event.meetingUrl && (
            <Action.OpenInBrowser
              title="Join Meeting"
              icon={Icon.Video}
              url={event.meetingUrl}
            />
          )}
          <Action.CopyToClipboard title="Copy Title" content={event.title} />
          <Action
            title={
              props.hideClones
                ? `Show Clones (${props.hiddenCloneCount} Hidden)`
                : "Hide Clones"
            }
            icon={Icon.EyeDisabled}
            shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
            onAction={props.onToggleClones}
          />
          <Action
            title="Reload"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={props.onRefresh}
          />
        </ActionPanel>
      }
    />
  );
}

async function fetchWithConnection(rangeStart: Date, rangeEnd: Date) {
  try {
    const accessToken = await authorize();
    const mcp = await connectMcp(accessToken);
    try {
      return await fetchUnifiedCalendar(mcp, rangeStart, rangeEnd);
    } finally {
      await mcp.close().catch(() => undefined);
    }
  } catch (e) {
    console.log(
      "[onecal] FAILED:",
      e instanceof Error ? `${e.name}: ${e.message}` : String(e),
    );
    throw e;
  }
}

const IMMINENT_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * 「次の会議」セクションの中身。終日イベントは対象外。
 * - 進行中（開始済み・終了前）の予定すべて（終了が近い順）
 * - 5分以内に始まる予定すべて（開始が近い順）
 * - 上記が無ければ、現在時刻以降で最も早く始まる予定1件
 */
function findFeaturedMeetings(
  events: OneCalEvent[],
): { event: OneCalEvent; ongoing: boolean }[] {
  const now = Date.now();
  const timed = events.filter((e) => !e.allDay && e.start);
  const ongoing = timed
    .filter(
      (e) =>
        new Date(e.start).getTime() <= now &&
        e.end !== undefined &&
        new Date(e.end).getTime() > now,
    )
    .sort((a, b) => (a.end ?? "").localeCompare(b.end ?? ""))
    .map((event) => ({ event, ongoing: true }));
  const imminent = timed
    .filter((e) => {
      const startMs = new Date(e.start).getTime();
      return startMs > now && startMs <= now + IMMINENT_THRESHOLD_MS;
    })
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((event) => ({ event, ongoing: false }));
  if (ongoing.length > 0 || imminent.length > 0) {
    return [...ongoing, ...imminent];
  }
  const upcoming = timed
    .filter((e) => new Date(e.start).getTime() > now)
    .sort((a, b) => a.start.localeCompare(b.start))[0];
  return upcoming ? [{ event: upcoming, ongoing: false }] : [];
}

function formatRelative(start: string, end: string | undefined): string {
  const now = Date.now();
  const startMs = new Date(start).getTime();
  if (startMs <= now) {
    const remaining = end
      ? Math.round((new Date(end).getTime() - now) / 60000)
      : undefined;
    return remaining !== undefined && remaining > 0
      ? `Ends in ${formatMinutes(remaining)}`
      : "In progress";
  }
  return `Starts in ${formatMinutes(Math.round((startMs - now) / 60000))}`;
}

function formatMinutes(totalMinutes: number): string {
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) {
    return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
  }
  const days = Math.floor(hours / 24);
  return `${days} d${hours % 24 ? ` ${hours % 24} h` : ""}`;
}

function parseStartDate(dateArg: string | undefined): Date {
  if (dateArg && /^\d{4}-\d{2}-\d{2}$/.test(dateArg)) {
    // 2026-02-30のような存在しない日付はDateが別日に正規化してしまうため、
    // 生成結果の年月日が入力と一致するかを照合し、不一致なら無効として今日にフォールバックする
    const [year, month, day] = dateArg.split("-").map(Number);
    const parsed = new Date(year, month - 1, day);
    if (
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day
    ) {
      return parsed;
    }
  }
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function groupByDay(events: OneCalEvent[]): Map<string, OneCalEvent[]> {
  const byDay = new Map<string, OneCalEvent[]>();
  for (const event of events) {
    const list = byDay.get(localDayOf(event.start)) ?? [];
    list.push(event);
    byDay.set(localDayOf(event.start), list);
  }
  return byDay;
}

/**
 * イベント開始日時のローカル暦日（YYYY-MM-DD）。
 * 文字列先頭のslice(0,10)だとUTC表記（...Z）のイベントがJST等で前日に化けるため、
 * Date経由でローカルタイムゾーンの暦日に正規化する。日付のみ（終日）はそのまま。
 */
function localDayOf(start: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(start)) {
    return start;
  }
  const date = new Date(start);
  return Number.isNaN(date.getTime())
    ? "(unknown date)"
    : formatLocalDate(date);
}

function formatDayHeader(day: string): string {
  const date = new Date(`${day}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return day;
  }
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
    date.getDay()
  ];
  const today = new Date();
  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
  return `${day} (${weekday})${isToday ? " — Today" : ""}`;
}

/** ローカルタイムゾーンの暦日で整形する（toISOString()はUTC化されJST等で1日ずれるため使わない） */
function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** rangeEndは排他的境界（翌日0:00）なので、表示用には1日戻して「含まれる最終日」を返す */
function inclusiveEnd(rangeEnd: Date): Date {
  const end = new Date(rangeEnd);
  end.setDate(end.getDate() - 1);
  return end;
}

function formatTimeRange(start: string, end: string | undefined): string {
  const startTime = toHm(start);
  const endTime = end ? toHm(end) : undefined;
  return endTime ? `${startTime}–${endTime}` : startTime;
}

function toHm(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

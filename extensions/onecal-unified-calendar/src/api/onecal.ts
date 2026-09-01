import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { callToolJson, listTools, resolveTool } from "./mcp";

// 注意: この2つの型はuseCachedPromiseでJSONシリアライズしてキャッシュされるため、
// 生イベント（nativeEvent等）は含めず、表示に必要なフィールドだけに絞って軽量に保つ。
export interface OneCalCalendar {
  id: string;
  name: string;
  color?: string;
  provider?: string;
  accountEmail?: string;
}

export interface OneCalEvent {
  id: string;
  calendarId?: string;
  calendarName?: string;
  title: string;
  start: string; // ISO日時 or YYYY-MM-DD（終日）
  end?: string;
  allDay: boolean;
  meetingUrl?: string;
  location?: string;
  isClone: boolean;
}

export interface UnifiedCalendarData {
  calendars: OneCalCalendar[];
  events: OneCalEvent[];
  toolNames: { listCalendars?: string; getEvents?: string };
  /** サーバーがクローンフラグ（isClone等のキー）を返しているか。値がすべてfalseでもキーがあればtrue */
  cloneFlagPresent: boolean;
}

export async function fetchUnifiedCalendar(
  client: Client,
  rangeStart: Date,
  rangeEnd: Date,
): Promise<UnifiedCalendarData> {
  const tools = await listTools(client);
  const listCalendarsTool = resolveTool(tools, [
    ["list", "calendars"],
    ["get", "calendars"],
    ["calendars"],
  ]);
  const getEventsTool = resolveTool(tools, [
    ["calendar", "events"],
    ["list", "events"],
    ["get", "events"],
    ["events"],
  ]);
  console.log("[onecal] resolved tools:", { listCalendarsTool, getEventsTool });
  if (!listCalendarsTool || !getEventsTool) {
    const available = tools.map((t) => t.name).join(", ");
    throw new Error(
      `Required MCP tools not found. Available tools: ${available}`,
    );
  }

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  // get-calendar-eventsのdateMin/dateMaxはUTCの"Z"表記のみ受け付ける（オフセット表記はスキーマで拒否される）
  const eventArgs = {
    dateMin: rangeStart.toISOString(),
    dateMax: rangeEnd.toISOString(),
    timeZone,
  };

  // カレンダー一覧とイベント一括取得は独立なので並列に投げてラウンドトリップを1回分節約する。
  // イベント側が引数エラー等で失敗した場合のみカレンダー単位の取得にフォールバックする。
  const [calendarsRaw, bulkResult] = await Promise.all([
    callToolJson(client, listCalendarsTool, {}),
    callToolJson(client, getEventsTool, eventArgs).then(
      (value) => ({ ok: true as const, value }),
      (error: unknown) => ({ ok: false as const, error }),
    ),
  ]);
  const calendars = asArray(calendarsRaw, ["calendars", "data", "items"]).map(
    normalizeCalendar,
  );
  console.log("[onecal] calendars:", calendars.length);

  // get-calendar-eventsの引数はdateMin/dateMax/timeZoneのみ（実スキーマで確認済み・カレンダー指定は不可）。
  // そのためカレンダー単位のフォールバック経路は存在せず、失敗はそのままUIのエラー表示（再試行つき）に出す。
  if (!bulkResult.ok) {
    throw bulkResult.error;
  }

  const rawEvents = flattenEventGroups(
    asArray(bulkResult.value, ["events", "data", "items"]),
  );
  const cloneFlagPresent = rawEvents.some(({ event }) =>
    hasCloneFlagKey(event),
  );
  const events = rawEvents.map(({ event, calendarId }) =>
    normalizeEvent(event, calendars, calendarId),
  );
  console.log(
    "[onecal] events:",
    events.length,
    "clones:",
    events.filter((e) => e.isClone).length,
    "meetingUrls:",
    events.filter((e) => e.meetingUrl).length,
  );

  events.sort((a, b) => a.start.localeCompare(b.start));
  return {
    calendars,
    events,
    toolNames: { listCalendars: listCalendarsTool, getEvents: getEventsTool },
    cloneFlagPresent,
  };
}

/**
 * クローンイベントの除去。
 * 1. サーバーがクローンフラグ（isCloneキー）を返している場合はフラグのみで判定する。
 *    「クローンが1件も無い期間」でもフォールバックが誤発動しないよう、
 *    判定にはフラグ値ではなくキーの有無（cloneFlagPresent）を使う。
 * 2. フラグが無い場合のみのフォールバック: 同一タイトル・同一開始/終了で複数カレンダーに存在する
 *    イベント群を1件に畳む（OneCal Syncのクローンはタイトル・時間が一致した複製として現れるため）。
 */
export function filterClones(
  events: OneCalEvent[],
  cloneFlagPresent: boolean,
): OneCalEvent[] {
  const flagged = events.filter((e) => !e.isClone);
  if (cloneFlagPresent) {
    return flagged;
  }
  const seen = new Map<string, OneCalEvent>();
  for (const event of flagged) {
    const key = `${event.title.trim().toLowerCase()}|${event.start}|${event.end ?? ""}`;
    if (!seen.has(key)) {
      seen.set(key, event);
    }
  }
  return [...seen.values()];
}

/** サーバー応答にクローンフラグのキー自体が含まれているか（値のtrue/falseは問わない） */
function hasCloneFlagKey(raw: Record<string, unknown>): boolean {
  return [
    "isClone",
    "is_clone",
    "isCloneEvent",
    "isCloned",
    "cloned",
    "isOneCalClone",
  ].some((key) => key in raw);
}

/**
 * get-calendar-eventsは [{calendar: {...}, events: [...]}, ...] とカレンダー毎にグループ化して返す。
 * フラットなイベント配列が来た場合もそのまま通す。
 */
function flattenEventGroups(
  items: Record<string, unknown>[],
): { event: Record<string, unknown>; calendarId?: string }[] {
  const result: { event: Record<string, unknown>; calendarId?: string }[] = [];
  for (const item of items) {
    if (Array.isArray(item.events)) {
      const calendarObj = (
        typeof item.calendar === "object" && item.calendar !== null
          ? item.calendar
          : {}
      ) as Record<string, unknown>;
      const calendarId =
        str(calendarObj, ["id", "calendarId"]) ?? str(item, ["calendarId"]);
      for (const event of item.events as Record<string, unknown>[]) {
        result.push({ event, calendarId });
      }
    } else {
      result.push({ event: item });
    }
  }
  return result;
}

function asArray(
  value: unknown,
  candidateKeys: string[],
): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value as Record<string, unknown>[];
  }
  if (typeof value === "object" && value !== null) {
    for (const key of candidateKeys) {
      const inner = (value as Record<string, unknown>)[key];
      if (Array.isArray(inner)) {
        return inner as Record<string, unknown>[];
      }
    }
  }
  return [];
}

function normalizeCalendar(raw: Record<string, unknown>): OneCalCalendar {
  return {
    id:
      str(raw, ["id", "calendarId", "uid"]) ?? JSON.stringify(raw).slice(0, 40),
    name: str(raw, ["name", "title", "summary", "displayName"]) ?? "(unnamed)",
    color: str(raw, ["color", "backgroundColor", "hexColor"]),
    provider: str(raw, ["provider", "providerType", "type", "platform"]),
    accountEmail: str(raw, ["accountEmail", "email", "account", "owner"]),
  };
}

function normalizeEvent(
  raw: Record<string, unknown>,
  calendars: OneCalCalendar[],
  groupCalendarId?: string,
): OneCalEvent {
  const calendarId =
    str(raw, ["calendarId", "calendar_id", "calendarUid"]) ?? groupCalendarId;
  const calendar = calendars.find((c) => c.id === calendarId);
  const start = dateStr(raw, [
    "start",
    "startTime",
    "startDate",
    "startDateTime",
  ]);
  const end = dateStr(raw, ["end", "endTime", "endDate", "endDateTime"]);
  return {
    id:
      str(raw, ["id", "eventId", "uid"]) ??
      `${start}-${str(raw, ["title", "summary"]) ?? ""}`,
    calendarId,
    calendarName: calendar?.name ?? str(raw, ["calendarName", "calendar"]),
    title: str(raw, ["title", "summary", "subject", "name"]) ?? "(untitled)",
    start: start ?? "",
    end,
    allDay: bool(raw, ["allDay", "isAllDay", "all_day"]) ?? isDateOnly(start),
    meetingUrl: extractMeetingUrl(raw),
    location: str(raw, ["location", "place"]),
    isClone: detectCloneFlag(raw),
  };
}

// テキスト中のURL候補（許可判定はisMeetingUrlでhostnameに対して行う。正規表現でのホスト判定は
// `https://evil.example/?target=meet.google.com` のような迂回を許すため使わない）
const URL_CANDIDATE_PATTERN = /https?:\/\/[^\s<>"']+/g;
const MEETING_HOSTS_EXACT = new Set([
  "meet.google.com",
  "teams.microsoft.com",
  "teams.live.com",
]);
const MEETING_HOST_SUFFIXES = [
  "zoom.us",
  "webex.com",
  "whereby.com",
  "gotomeeting.com",
  "chime.aws",
];

/** httpsのみ・hostnameの完全一致または「.suffix」境界つきサブドメインのみ許可する */
function isMeetingUrl(candidate: string): boolean {
  const url = parseHttpsUrl(candidate);
  if (!url) {
    return false;
  }
  const host = url.hostname.toLowerCase();
  return (
    MEETING_HOSTS_EXACT.has(host) ||
    MEETING_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`),
    )
  );
}

// 許可ホストでもhttp://は平文で改竄・盗聴されうるため、会議URLはhttpsのみ受け付ける
function parseHttpsUrl(candidate: string): URL | undefined {
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" ? url : undefined;
  } catch {
    return undefined;
  }
}

function findMeetingUrlInText(text: string | undefined): string | undefined {
  return text?.match(URL_CANDIDATE_PATTERN)?.find(isMeetingUrl);
}

/**
 * 会議URLの抽出。OneCalのイベントはトップレベルに会議URLを持たず、
 * nativeEvent（プロバイダー生イベント）内のGoogle/Outlook形式か、location/description中のURLから拾う。
 */
function extractMeetingUrl(raw: Record<string, unknown>): string | undefined {
  // 構造化フィールド・自由記述を問わず、すべての会議URL候補をhostname許可リスト（isMeetingUrl）で検証する。
  // 会議URLはイベント作成者が任意に設定できるため、出所によらずfail-closedにする。
  const direct = str(raw, [
    "meetingUrl",
    "conferenceUrl",
    "videoUrl",
    "hangoutLink",
    "joinUrl",
    "onlineMeetingUrl",
  ]);
  if (direct && isMeetingUrl(direct)) {
    return direct;
  }
  const native =
    typeof raw.nativeEvent === "object" && raw.nativeEvent !== null
      ? (raw.nativeEvent as Record<string, unknown>)
      : undefined;
  if (native) {
    // Google Calendar形式
    const hangout = str(native, ["hangoutLink"]);
    if (hangout && isMeetingUrl(hangout)) {
      return hangout;
    }
    const conf =
      typeof native.conferenceData === "object" &&
      native.conferenceData !== null
        ? (native.conferenceData as Record<string, unknown>)
        : undefined;
    if (conf && Array.isArray(conf.entryPoints)) {
      const entryPoints = conf.entryPoints as Record<string, unknown>[];
      const video =
        entryPoints.find((p) => p.entryPointType === "video") ?? entryPoints[0];
      const uri = video ? str(video, ["uri"]) : undefined;
      if (uri && isMeetingUrl(uri)) {
        return uri;
      }
    }
    // Outlook形式
    const om =
      typeof native.onlineMeeting === "object" && native.onlineMeeting !== null
        ? (native.onlineMeeting as Record<string, unknown>)
        : undefined;
    const joinUrl =
      (om ? str(om, ["joinUrl"]) : undefined) ??
      str(native, ["onlineMeetingUrl", "joinUrl"]);
    if (joinUrl && isMeetingUrl(joinUrl)) {
      return joinUrl;
    }
    // テキストフィールド中のURL（自由記述のため許可リスト検証つき）
    for (const key of ["location", "description", "bodyPreview", "body"]) {
      const value = native[key];
      const text =
        typeof value === "string"
          ? value
          : typeof value === "object" && value !== null
            ? str(value as Record<string, unknown>, ["content", "displayName"])
            : undefined;
      const found = findMeetingUrlInText(text);
      if (found) {
        return found;
      }
    }
  }
  const topText = [str(raw, ["location"]), str(raw, ["description"])]
    .filter(Boolean)
    .join(" ");
  return findMeetingUrlInText(topText);
}

/** サーバーがクローンを示すフラグを持っていれば拾う（実スキーマは接続後に確認・必要なら拡充する） */
function detectCloneFlag(raw: Record<string, unknown>): boolean {
  return (
    bool(raw, [
      "isClone",
      "is_clone",
      "isCloneEvent",
      "isCloned",
      "cloned",
      "isOneCalClone",
    ]) === true ||
    str(raw, [
      "cloneOf",
      "clonedFrom",
      "cloneSourceEventId",
      "sourceEventId",
    ]) !== undefined
  );
}

function str(raw: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

function bool(
  raw: Record<string, unknown>,
  keys: string[],
): boolean | undefined {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "boolean") {
      return value;
    }
  }
  return undefined;
}

/** start/endが {dateTime}/{date} のようなオブジェクトでも文字列でも受ける */
function dateStr(
  raw: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
    if (typeof value === "object" && value !== null) {
      const inner = value as Record<string, unknown>;
      const dt = inner.dateTime ?? inner.date ?? inner.value;
      if (typeof dt === "string" && dt.length > 0) {
        return dt;
      }
    }
  }
  return undefined;
}

function isDateOnly(value: string | undefined): boolean {
  return value !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

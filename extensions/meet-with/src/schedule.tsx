import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  environment,
  getPreferenceValues,
  Keyboard,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { execSync } from "node:child_process";
import { getSchedule, Event, Person } from "./google";

function dayKeyOf(ev: Event): string {
  if (ev.allDay) return ev.start.slice(0, 10);
  const d = new Date(ev.start);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function labelFor(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function timeText(ev: Event): string {
  if (ev.allDay) return "All day";
  const opts = { hour: "numeric", minute: "2-digit" } as const;
  return `${new Date(ev.start).toLocaleTimeString([], opts)} – ${new Date(ev.end).toLocaleTimeString([], opts)}`;
}

function calendarUrlFor(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return `https://calendar.google.com/calendar/u/0/r/day/${y}/${m}/${d}`;
}

interface Slot {
  start: Date;
  end: Date;
}

// Every bookable free 30-min grid slot between 9am–5pm. Busy and already-past
// slots are dropped — only future openings appear.
function freeSlots(key: string, dayEvents: Event[]): Slot[] {
  const [y, m, d] = key.split("-").map(Number);
  const nowMs = Date.now();
  const busy = dayEvents
    .filter((e) => !e.allDay)
    .map(
      (e) => [new Date(e.start).getTime(), new Date(e.end).getTime()] as const,
    );
  const slots: Slot[] = [];
  for (let mins = 9 * 60; mins + 30 <= 17 * 60; mins += 30) {
    const start = new Date(y, m - 1, d, Math.floor(mins / 60), mins % 60);
    const end = new Date(start.getTime() + 30 * 60000);
    if (end.getTime() <= nowMs) continue;
    if (busy.some(([bs, be]) => start.getTime() < be && end.getTime() > bs))
      continue;
    slots.push({ start, end });
  }
  return slots;
}

function slotTimeText(s: Slot): string {
  const opts = { hour: "numeric", minute: "2-digit" } as const;
  return `${s.start.toLocaleTimeString([], opts)} – ${s.end.toLocaleTimeString([], opts)}`;
}

// Google Calendar event composer, pre-filled with the person as a guest and dated
// to the chosen slot. The "Find a time" tab then shows availability.
function inviteUrlForSlot(person: Person, start: Date, end: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    add: person.email,
    ctz: tz,
    text: `Meet with ${person.name}`,
  });
  // dates kept with a literal slash (not URL-encoded) to match Google's format.
  return `https://calendar.google.com/calendar/render?${params.toString()}&dates=${fmt(start)}/${fmt(end)}`;
}

function fmtHour(h: number): string {
  const ampm = h < 12 ? "AM" : "PM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr} ${ampm}`;
}

const xmlEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// One accent color for every block. Preference "system" reads the macOS accent
// (defaults(1) index); anything else is a literal hex. Blue is the fallback on
// the default multicolor accent, on read failure, and on non-macOS.
const ACCENT_BY_INDEX: Record<string, string> = {
  "-1": "#8E8E93",
  "0": "#FF3B30",
  "1": "#FF9500",
  "2": "#FFCC00",
  "3": "#34C759",
  "4": "#007AFF",
  "5": "#AF52DE",
  "6": "#FF2D55",
};
let cachedSystemAccent: string | undefined;
function resolveAccent(): string {
  const { eventColor: pref, customEventColor } =
    getPreferenceValues<Preferences>();
  if (pref === "custom") {
    const hex = (customEventColor ?? "").trim().replace(/^#?/, "#");
    return /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#007AFF";
  }
  if (pref !== "system") return pref;
  if (cachedSystemAccent) return cachedSystemAccent;
  try {
    const idx = execSync("defaults read -g AppleAccentColor 2>/dev/null")
      .toString()
      .trim();
    cachedSystemAccent = ACCENT_BY_INDEX[idx] ?? "#007AFF";
  } catch {
    cachedSystemAccent = "#007AFF";
  }
  return cachedSystemAccent;
}

type Selection = { kind: "event"; ev: Event } | { kind: "slot"; slot: Slot };

// --- Graphical day view: an SVG drawn to scale, embedded as a data-URI image. ---
function dayCalendarSvg(
  label: string,
  dayEvents: Event[],
  selection: Selection,
  accent: string,
): string {
  const isToday = label === "Today";
  // The detail pane follows the Raycast theme; translucent white chrome vanishes
  // on the light background, so pick the palette per appearance.
  const C =
    environment.appearance === "dark"
      ? {
          line: "#ffffff1f",
          strip: "#ffffff1a",
          stripText: "#d0d0d6",
          blockA: "80",
          pastA: "4d",
          sel: "#fff",
        }
      : {
          line: "#0000001f",
          strip: "#0000000d",
          stripText: "#3a3a3c",
          blockA: "d9",
          pastA: "99",
          sel: "#1c1c1e",
        };
  const timed = dayEvents
    .filter((e) => !e.allDay)
    .map((e) => ({ raw: e, s: new Date(e.start), e2: new Date(e.end) }));
  const allDay = dayEvents.filter((e) => e.allDay);

  let minH = 8;
  let maxH = 18;
  for (const t of timed) {
    minH = Math.min(minH, t.s.getHours());
    maxH = Math.max(maxH, t.e2.getHours() + (t.e2.getMinutes() > 0 ? 1 : 0));
  }
  const now = new Date();
  if (isToday) {
    minH = Math.min(minH, now.getHours());
    maxH = Math.max(maxH, now.getHours() + 1);
  }

  const HOURH = 46;
  const W = 470;
  const GUT = 46;
  const allDayH = allDay.length ? 28 : 0;
  const top = 8 + allDayH;
  const bodyW = W - GUT - 8;
  const hours = maxH - minH;
  const H = top + hours * HOURH + 8;
  const yOf = (d: Date) =>
    top + ((d.getHours() * 60 + d.getMinutes()) / 60 - minH) * HOURH;

  // Column packing so overlapping events sit side-by-side (Apple-style).
  timed.sort(
    (a, b) => a.s.getTime() - b.s.getTime() || a.e2.getTime() - b.e2.getTime(),
  );
  const placed: { raw: Event; s: Date; e2: Date; col: number; cols: number }[] =
    [];
  let cluster: typeof timed = [];
  let clusterEnd = -Infinity;
  const flush = () => {
    const colEnd: number[] = [];
    const assigned = cluster.map((t) => {
      let c = 0;
      while (c < colEnd.length && t.s.getTime() < colEnd[c]) c++;
      colEnd[c] = t.e2.getTime();
      return { ...t, col: c };
    });
    for (const a of assigned) placed.push({ ...a, cols: colEnd.length });
    cluster = [];
  };
  for (const t of timed) {
    if (cluster.length && t.s.getTime() >= clusterEnd) {
      flush();
      clusterEnd = -Infinity;
    }
    cluster.push(t);
    clusterEnd = Math.max(clusterEnd, t.e2.getTime());
  }
  flush();

  const parts: string[] = [];
  // hour gridlines + labels
  for (let h = minH; h <= maxH; h++) {
    const y = top + (h - minH) * HOURH;
    parts.push(
      `<line x1="${GUT}" y1="${y}" x2="${W}" y2="${y}" stroke="${C.line}" stroke-width="1"/>`,
    );
    if (h < maxH)
      parts.push(
        `<text x="${GUT - 6}" y="${y + 4}" fill="#8b8b93" font-size="10" text-anchor="end">${fmtHour(h)}</text>`,
      );
  }
  // all-day strip
  if (allDay.length) {
    parts.push(
      `<rect x="${GUT}" y="4" width="${bodyW}" height="20" rx="5" fill="${C.strip}"/>`,
    );
    parts.push(
      `<text x="${GUT + 8}" y="18" fill="${C.stripText}" font-size="11">${xmlEscape("All-day · " + allDay.map((e) => e.title).join(" · ")).slice(0, 80)}</text>`,
    );
  }
  // event blocks — events that already ended today render muted gray (disabled);
  // in-progress and future events keep the accent color.
  const nowMs = now.getTime();
  for (const p of placed) {
    const y1 = yOf(p.s);
    const y2 = Math.max(yOf(p.e2), y1 + 18);
    const colW = bodyW / p.cols;
    const x = GUT + p.col * colW;
    const w = colW - 3;
    const hgt = y2 - y1;
    const isSel = selection.kind === "event" && p.raw === selection.ev;
    const isPast = isToday && p.e2.getTime() <= nowMs;
    const fill = isPast ? "#8E8E93" : accent;
    parts.push(
      `<rect x="${x}" y="${y1}" width="${w}" height="${hgt}" rx="6" fill="${fill}${isPast ? C.pastA : C.blockA}"/>`,
    );
    parts.push(
      `<rect x="${x}" y="${y1}" width="3" height="${hgt}" rx="1.5" fill="${isPast ? "#ffffff59" : "#ffffffcc"}"/>`,
    );
    // Selection outline, inset 1px so the stroke stays inside the card edges.
    if (isSel)
      parts.push(
        `<rect x="${x + 1}" y="${y1 + 1}" width="${w - 2}" height="${hgt - 2}" rx="5" fill="none" stroke="${C.sel}" stroke-width="2"/>`,
      );
    const title = xmlEscape(p.raw.title).slice(
      0,
      Math.max(6, Math.floor(w / 6.5)),
    );
    parts.push(
      `<text x="${x + 8}" y="${y1 + 15}" fill="${isPast ? "#ffffff80" : "#fff"}" font-size="11.5" font-weight="600">${title}</text>`,
    );
    if (hgt > 30) {
      const tt = xmlEscape(timeText(p.raw)).slice(
        0,
        Math.max(6, Math.floor(w / 6)),
      );
      parts.push(
        `<text x="${x + 8}" y="${y1 + 30}" fill="${isPast ? "#ffffff59" : "#ffffffcc"}" font-size="10">${tt}</text>`,
      );
    }
  }
  // selected free slot: dashed outline over the open grid space
  if (selection.kind === "slot") {
    const sy1 = yOf(selection.slot.start);
    const sy2 = yOf(selection.slot.end);
    parts.push(
      `<rect x="${GUT}" y="${sy1}" width="${bodyW}" height="${sy2 - sy1}" rx="6" fill="${accent}33" stroke="${C.sel}" stroke-width="2" stroke-dasharray="5 4"/>`,
    );
    parts.push(
      `<text x="${GUT + 8}" y="${sy1 + 15}" fill="${C.sel}" font-size="11.5" font-weight="600">New meeting</text>`,
    );
  }
  // now line
  if (isToday) {
    const y = yOf(now);
    parts.push(
      `<line x1="${GUT}" y1="${y}" x2="${W}" y2="${y}" stroke="#FF3B30" stroke-width="2"/>`,
    );
    parts.push(`<circle cx="${GUT}" cy="${y}" r="4" fill="#FF3B30"/>`);
  }

  // Window the viewBox around the selection so the detail "scrolls" to follow the
  // selected row instead of always showing the top of the day.
  const selCenterY =
    selection.kind === "event"
      ? (yOf(new Date(selection.ev.start)) + yOf(new Date(selection.ev.end))) /
        2
      : (yOf(selection.slot.start) + yOf(selection.slot.end)) / 2;
  const WINH = 360;
  let winTop = 0;
  let winH = H;
  if (H > WINH) {
    winH = WINH;
    winTop = Math.max(0, Math.min(selCenterY - WINH / 2, H - WINH));
  }
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${winH}" viewBox="0 ${winTop} ${W} ${winH}" font-family="-apple-system,Helvetica,sans-serif">` +
    parts.join("") +
    `</svg>`;
  const uri =
    "data:image/svg+xml;base64," + Buffer.from(svg, "utf8").toString("base64");
  return `### ${label}\n\n![calendar](${uri})`;
}

type Mode = "calendar" | "off";

// Right-aligned time (muted, can't mid-clip like an inline subtitle) plus the Meet
// icon. Raycast List items are single-line, so this is the flat equivalent of the
// requested title-over-time stack: title left, time + Meet right.
function accessoriesFor(ev: Event): List.Item.Accessory[] {
  const acc: List.Item.Accessory[] = [{ text: timeText(ev) }];
  if (ev.attendees)
    acc.push({
      icon: Icon.TwoPeople,
      text: String(ev.attendees),
      tooltip: "Attendees",
    });
  if (ev.meetLink)
    acc.push({
      icon: { source: Icon.Video, tintColor: Color.Green },
      tooltip: "Google Meet",
    });
  return acc;
}

type Row =
  | { kind: "event"; ev: Event; sort: number }
  | { kind: "slot"; slot: Slot; sort: number };

export default function Schedule({ person }: { person: Person }) {
  const { data, isLoading } = useCachedPromise(getSchedule, [person.email]);
  const [mode, setMode] = useState<Mode>("calendar");
  const events = data?.events ?? [];
  const busyOnly = data?.busyOnly ?? false;

  const byDay = new Map<string, Event[]>();
  for (const ev of events) {
    const key = dayKeyOf(ev);
    (byDay.get(key) ?? byDay.set(key, []).get(key)!).push(ev);
  }
  const days = [...byDay.keys()].sort();
  const accent = resolveAccent();

  const toggle = () => (
    <Action
      title={mode === "calendar" ? "Hide Calendar" : "Show Calendar"}
      icon={Icon.AppWindowSidebarRight}
      onAction={() => setMode((m) => (m === "calendar" ? "off" : "calendar"))}
    />
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={mode !== "off"}
      navigationTitle={person.name}
    >
      {busyOnly && (
        <List.Item
          icon={Icon.Info}
          title="Free/busy only"
          subtitle="Calendar not shared — booking against busy blocks."
        />
      )}
      {days.map((key) => {
        const dayEvents = byDay.get(key)!;
        const label = labelFor(key);
        const isToday = label === "Today";
        const nowMs = Date.now();
        const rowEnd = (r: Row) =>
          r.kind === "event"
            ? new Date(r.ev.end).getTime()
            : r.slot.end.getTime();
        // On today, hide already-ended rows from the list; the calendar (fed the
        // full dayEvents) still renders them, greyed.
        const rows: Row[] = [
          ...dayEvents.map((ev): Row => ({
            kind: "event",
            ev,
            sort: new Date(ev.start).getTime(),
          })),
          ...freeSlots(key, dayEvents).map((slot): Row => ({
            kind: "slot",
            slot,
            sort: slot.start.getTime(),
          })),
        ]
          .filter((r) => !isToday || rowEnd(r) > nowMs)
          .sort((a, b) => a.sort - b.sort);
        if (rows.length === 0) return null;
        const eventCount = rows.filter((r) => r.kind === "event").length;
        const openCount = rows.filter((r) => r.kind === "slot").length;
        return (
          <List.Section
            key={key}
            title={label}
            subtitle={`${eventCount} event${eventCount === 1 ? "" : "s"} · ${openCount} open`}
          >
            {rows.map((row, i) =>
              row.kind === "event" ? (
                <List.Item
                  key={`${key}-${i}`}
                  icon={row.ev.title === "Busy" ? Icon.Clock : Icon.Calendar}
                  title={row.ev.title}
                  accessories={accessoriesFor(row.ev)}
                  detail={
                    mode === "off" ? undefined : (
                      <List.Item.Detail
                        markdown={dayCalendarSvg(
                          label,
                          dayEvents,
                          { kind: "event", ev: row.ev },
                          accent,
                        )}
                      />
                    )
                  }
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser
                        title="Open in Google Calendar"
                        icon={Icon.Calendar}
                        url={row.ev.htmlLink ?? calendarUrlFor(key)}
                      />
                      {row.ev.meetLink && (
                        <Action.OpenInBrowser
                          title="Join Google Meet"
                          icon={{ source: Icon.Video, tintColor: Color.Green }}
                          url={row.ev.meetLink}
                        />
                      )}
                      {toggle()}
                      <Action.OpenInBrowser
                        title="Open Day in Google Calendar"
                        url={calendarUrlFor(key)}
                      />
                      <Action.CopyToClipboard
                        title="Copy Email"
                        content={person.email}
                      />
                    </ActionPanel>
                  }
                />
              ) : (
                <List.Item
                  key={`${key}-${i}`}
                  icon={{ source: Icon.Plus, tintColor: Color.SecondaryText }}
                  title="Open"
                  accessories={[{ text: slotTimeText(row.slot) }]}
                  detail={
                    mode === "off" ? undefined : (
                      <List.Item.Detail
                        markdown={dayCalendarSvg(
                          label,
                          dayEvents,
                          { kind: "slot", slot: row.slot },
                          accent,
                        )}
                      />
                    )
                  }
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser
                        title={`New Invite with ${person.name}`}
                        icon={Icon.PlusCircle}
                        shortcut={Keyboard.Shortcut.Common.New}
                        url={inviteUrlForSlot(
                          person,
                          row.slot.start,
                          row.slot.end,
                        )}
                      />
                      {toggle()}
                      <Action.OpenInBrowser
                        title="Open Day in Google Calendar"
                        url={calendarUrlFor(key)}
                      />
                    </ActionPanel>
                  }
                />
              ),
            )}
          </List.Section>
        );
      })}
      <List.EmptyView
        title="No events"
        description={`${person.name} has nothing scheduled this week.`}
      />
    </List>
  );
}

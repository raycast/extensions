import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  Keyboard,
  List,
  confirmAlert,
  getPreferenceValues,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { ensureOverlay } from "./overlay";
import {
  Active,
  KIND_TITLE,
  Kind,
  Session,
  loadActive,
  loadHistory,
  newId,
  reconcile,
  record,
  remainingOf,
  saveActive,
  saveHistory,
} from "./storage";
import * as svg from "./svg";
import { DAY, MIN, clock, duration, hhmm } from "./svg";

type Prefs = {
  focusMinutes?: string;
  shortBreakMinutes?: string;
  longBreakMinutes?: string;
  longBreakInterval?: string;
  dailyGoal?: string;
  showOverlay?: boolean;
  playSound?: boolean;
};

function settings() {
  const p = getPreferenceValues<Prefs>();
  const n = (v: string | undefined, fallback: number) => (Number(v) > 0 ? Number(v) : fallback);
  return {
    minutes: {
      focus: n(p.focusMinutes, 25),
      short: n(p.shortBreakMinutes, 5),
      long: n(p.longBreakMinutes, 15),
    } as Record<Kind, number>,
    interval: n(p.longBreakInterval, 4),
    goal: n(p.dailyGoal, 8),
    overlay: p.showOverlay !== false,
    sound: p.playSound !== false,
  };
}

const startOfDay = (t: number) => new Date(new Date(t).toDateString()).getTime();
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const sumFocus = (list: Session[]) => list.reduce((t, s) => t + s.focusedMs, 0);

function dayTitle(day: number, today: number) {
  if (day === today) return "Today";
  if (day === today - DAY) return "Yesterday";
  return new Date(day).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function streakOf(completedDays: Set<number>, today: number) {
  let day = completedDays.has(today) ? today : today - DAY;
  let streak = 0;
  while (completedDays.has(day)) {
    streak++;
    day = startOfDay(day - DAY / 2);
  }
  return streak;
}

function toCsv(history: Session[]) {
  const rows = history.map((s) =>
    [
      new Date(s.startedAt).toISOString(),
      new Date(s.endedAt).toISOString(),
      `"${s.label.replace(/"/g, '""')}"`,
      Math.round(s.focusedMs / MIN),
      s.completed ? "completed" : "stopped",
    ].join(","),
  );
  return ["start,end,task,minutes,status", ...rows].join("\n");
}

function progressIcon(fraction: number) {
  if (fraction > 0.875) return Icon.CircleProgress100;
  if (fraction > 0.625) return Icon.CircleProgress75;
  if (fraction > 0.375) return Icon.CircleProgress50;
  if (fraction > 0.125) return Icon.CircleProgress25;
  return Icon.Circle;
}

// Reads both files and closes a session that ended on its own or was stopped
// from the floating timer. Runs on the first render and then every second.
function readState(history: Session[]) {
  const stored = loadActive();
  const r = reconcile(stored, history, Date.now());
  if (r.history !== history) saveHistory(r.history);
  if (!r.active && stored) saveActive(null);
  return r;
}

export default function Command() {
  const [initial] = useState(() => readState(loadHistory()));
  const [active, setActive] = useState<Active | null>(initial.active);
  const [history, setHistory] = useState<Session[]>(initial.history);
  const [now, setNow] = useState(Date.now());
  const [search, setSearch] = useState("");

  useEffect(() => {
    ensureOverlay(initial.active);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const r = readState(history);
    if (r.history !== history) setHistory(r.history);
    setActive(r.active);
  }, [now]);

  const cfg = settings();
  const today = startOfDay(now);
  const label = search.trim();

  const doneToday = history.filter((s) => s.completed && s.endedAt >= today);
  const focusedToday = sumFocus(history.filter((s) => s.endedAt >= today));
  const completedDays = new Set(history.filter((s) => s.completed).map((s) => startOfDay(s.endedAt)));
  const streak = streakOf(completedDays, today);
  const lastSession = history.length ? history[history.length - 1] : undefined;
  const justFocused = !active && !!lastSession?.completed && now - lastSession.endedAt < 20 * MIN;
  const cycleDone = doneToday.length % cfg.interval || (justFocused ? cfg.interval : 0);
  const suggestedBreak: Kind = doneToday.length > 0 && doneToday.length % cfg.interval === 0 ? "long" : "short";

  function start(kind: Kind, withLabel = label) {
    const t = Date.now();
    const r = reconcile(loadActive(), history, t);
    let h = r.history;
    if (r.active) h = record(r.active, false, t, remainingOf(r.active, t), h);
    const durationMs = cfg.minutes[kind] * MIN;
    const next: Active = {
      id: newId(),
      kind,
      label: kind === "focus" ? withLabel : "",
      durationMs,
      startedAt: t,
      endAt: t + durationMs,
      paused: false,
      remainingMs: durationMs,
      overlay: cfg.overlay,
      sound: cfg.sound,
    };
    saveHistory(h);
    saveActive(next);
    setHistory(h);
    setActive(next);
    setSearch("");
    ensureOverlay(next, true);
    showHUD(`${KIND_TITLE[kind]} started, ${cfg.minutes[kind]} min`);
  }

  function update(change: (a: Active, t: number) => Active) {
    const a = loadActive();
    if (!a) return;
    const next = change(a, Date.now());
    saveActive(next);
    setActive(next);
    ensureOverlay(next);
  }

  const pause = () => update((a, t) => (a.paused ? a : { ...a, paused: true, remainingMs: a.endAt - t }));
  const resume = () => update((a, t) => (a.paused ? { ...a, paused: false, endAt: t + a.remainingMs } : a));
  const toggleOverlay = () => update((a) => ({ ...a, overlay: !a.overlay }));
  const rename = () => {
    update((a) => ({ ...a, label }));
    setSearch("");
  };

  async function stop() {
    const a = loadActive();
    if (!a) return;
    const t = Date.now();
    const h = record(a, false, t, remainingOf(a, t), history);
    saveHistory(h);
    saveActive(null);
    setHistory(h);
    setActive(null);
    await showToast({
      style: Toast.Style.Success,
      title: `${KIND_TITLE[a.kind]} stopped`,
      message: h.length > history.length ? "Saved to history" : undefined,
    });
  }

  function removeSession(id: string) {
    const h = history.filter((s) => s.id !== id);
    saveHistory(h);
    setHistory(h);
  }

  async function clearHistory() {
    const ok = await confirmAlert({
      title: "Clear All History?",
      message: "Every recorded focus session will be deleted. This cannot be undone.",
      primaryAction: { title: "Clear History", style: Alert.ActionStyle.Destructive },
    });
    if (ok) {
      saveHistory([]);
      setHistory([]);
    }
  }

  const historyActions = (
    <ActionPanel.Section>
      <Action.CopyToClipboard
        title="Copy History as CSV"
        content={toCsv(history)}
        shortcut={Keyboard.Shortcut.Common.Copy}
      />
      <Action
        title="Clear All History"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        onAction={clearHistory}
        shortcut={Keyboard.Shortcut.Common.RemoveAll}
      />
    </ActionPanel.Section>
  );

  const startActions = (first: Kind) => (
    <ActionPanel.Section>
      {(["focus", "short", "long"] as Kind[])
        .sort((a, b) => (a === first ? -1 : b === first ? 1 : 0))
        .map((k) => (
          <Action
            key={k}
            title={k === "focus" && label ? `Start Focus on "${label}"` : `Start ${KIND_TITLE[k]}`}
            icon={k === "focus" ? Icon.Play : Icon.Mug}
            onAction={() => start(k)}
          />
        ))}
    </ActionPanel.Section>
  );

  const previewCard = (kind: Kind, caption: string) =>
    svg.image(
      svg.timerCard({
        kind,
        remainingMs: cfg.minutes[kind] * MIN,
        durationMs: cfg.minutes[kind] * MIN,
        paused: false,
        running: false,
        label: kind === "focus" ? label : "",
        caption,
        cycleDone,
        cycleLength: cfg.interval,
      }),
    );

  // Charts
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = startOfDay(today - (6 - i) * DAY + DAY / 2);
    const ms = sumFocus(history.filter((s) => startOfDay(s.endedAt) === day));
    return { label: new Date(day).toLocaleDateString("en-US", { weekday: "short" }), ms, today: day === today };
  });
  const weekMs = week.reduce((t, d) => t + d.ms, 0);
  const weekDone = history.filter((s) => s.completed && s.endedAt >= today - 6 * DAY).length;
  const counts = new Map<number, number>();
  for (const s of history)
    if (s.completed) counts.set(startOfDay(s.endedAt), (counts.get(startOfDay(s.endedAt)) ?? 0) + 1);
  const byHour = Array.from({ length: 24 }, () => 0);
  for (const s of history) byHour[new Date(s.startedAt).getHours()] += s.focusedMs;

  const weekMarkdown = [
    svg.image(
      svg.tiles([
        { value: String(doneToday.length), label: "Today" },
        { value: duration(weekMs), label: "This week" },
        { value: String(streak), label: streak === 1 ? "Day streak" : "Days streak" },
        { value: String(history.filter((s) => s.completed).length), label: "All time" },
      ]),
    ),
    svg.image(svg.weekBars(week, cfg.goal * cfg.minutes.focus * MIN)),
  ].join("\n\n");
  const trendsMarkdown = [svg.image(svg.heatmap(counts, today)), svg.image(svg.hourBars(byHour))].join("\n\n");

  // History grouped by day, newest first
  const days = new Map<number, Session[]>();
  for (const s of [...history].sort((a, b) => b.endedAt - a.endedAt)) {
    const d = startOfDay(s.endedAt);
    days.set(d, [...(days.get(d) ?? []), s]);
  }

  const left = active ? remainingOf(active, now) : 0;
  const activeCaption = active ? (active.paused ? "Press Enter to resume" : `Ends at ${hhmm(active.endAt)}`) : "";

  return (
    <List
      isShowingDetail
      filtering={false}
      searchText={search}
      onSearchTextChange={setSearch}
      searchBarPlaceholder={active ? "Type to rename the current task" : "What are you focusing on?"}
      navigationTitle={
        active ? `${KIND_TITLE[active.kind]} ${clock(left)}${active.paused ? " (paused)" : ""}` : "Pomodoro"
      }
    >
      {active ? (
        <List.Section title="Now">
          <List.Item
            id="now"
            icon={{ source: active.paused ? Icon.Pause : progressIcon(left / active.durationMs), tintColor: Color.Red }}
            title={clock(left)}
            subtitle={active.kind === "focus" ? active.label || "Focus" : KIND_TITLE[active.kind]}
            detail={
              <List.Item.Detail
                markdown={svg.image(
                  svg.timerCard({
                    kind: active.kind,
                    remainingMs: left,
                    durationMs: active.durationMs,
                    paused: active.paused,
                    running: true,
                    label: active.label,
                    caption: activeCaption,
                    cycleDone: doneToday.length % cfg.interval,
                    cycleLength: cfg.interval,
                  }),
                )}
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  {active.paused ? (
                    <Action title="Resume" icon={Icon.Play} onAction={resume} />
                  ) : (
                    <Action title="Pause" icon={Icon.Pause} onAction={pause} />
                  )}
                  <Action title="Stop" icon={Icon.Stop} style={Action.Style.Destructive} onAction={stop} />
                  {label ? <Action title={`Rename to "${label}"`} icon={Icon.Pencil} onAction={rename} /> : null}
                  <Action
                    title={active.overlay ? "Hide Floating Timer" : "Show Floating Timer"}
                    icon={active.overlay ? Icon.EyeDisabled : Icon.Eye}
                    onAction={toggleOverlay}
                    shortcut={{ modifiers: ["ctrl", "shift"], key: "f" }}
                  />
                </ActionPanel.Section>
                {startActions(active.kind === "focus" ? suggestedBreak : "focus")}
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}

      <List.Section title={active ? "Switch To" : "Start"}>
        {justFocused ? (
          <List.Item
            id="suggested-break"
            icon={{ source: Icon.Mug, tintColor: Color.Red }}
            title={`Start ${KIND_TITLE[suggestedBreak]}`}
            subtitle="Focus session complete"
            detail={<List.Item.Detail markdown={previewCard(suggestedBreak, "Nice work. Press Enter to rest")} />}
            actions={
              <ActionPanel>
                {startActions(suggestedBreak)}
                {historyActions}
              </ActionPanel>
            }
          />
        ) : null}
        <List.Item
          id="start-focus"
          icon={{ source: Icon.Play, tintColor: Color.Red }}
          title={label && !active ? `Focus on "${label}"` : "Focus"}
          accessories={[{ text: `${cfg.minutes.focus} min` }]}
          detail={
            <List.Item.Detail
              markdown={
                active
                  ? previewCard("focus", "Press Enter to start a new session")
                  : svg.image(svg.todayCard(doneToday.length, cfg.goal, focusedToday, streak))
              }
            />
          }
          actions={
            <ActionPanel>
              {startActions("focus")}
              {historyActions}
            </ActionPanel>
          }
        />
        {(["short", "long"] as Kind[]).map((k) => (
          <List.Item
            id={`start-${k}`}
            key={k}
            icon={{ source: Icon.Mug, tintColor: Color.SecondaryText }}
            title={KIND_TITLE[k]}
            accessories={[{ text: `${cfg.minutes[k]} min` }]}
            detail={<List.Item.Detail markdown={previewCard(k, "Press Enter to start")} />}
            actions={
              <ActionPanel>
                {startActions(k)}
                {historyActions}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Insights">
        <List.Item
          id="week"
          icon={{ source: Icon.BarChart, tintColor: Color.Red }}
          title="This Week"
          accessories={[{ text: `${plural(weekDone, "session")}` }]}
          detail={<List.Item.Detail markdown={weekMarkdown} />}
          actions={
            <ActionPanel>
              {startActions("focus")}
              {historyActions}
            </ActionPanel>
          }
        />
        <List.Item
          id="trends"
          icon={{ source: Icon.Calendar, tintColor: Color.Red }}
          title="Trends"
          accessories={[{ text: streak > 0 ? `${streak}-day streak` : "" }]}
          detail={<List.Item.Detail markdown={trendsMarkdown} />}
          actions={
            <ActionPanel>
              {startActions("focus")}
              {historyActions}
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="History">
        {[...days.entries()].map(([day, sessions]) => {
          const done = sessions.filter((s) => s.completed).length;
          return (
            <List.Item
              id={`day-${day}`}
              key={day}
              icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
              title={dayTitle(day, today)}
              accessories={[
                { icon: Icon.CheckCircle, text: String(done), tooltip: plural(done, "completed session") },
                { text: duration(sumFocus(sessions)) },
              ]}
              detail={
                <List.Item.Detail
                  markdown={svg.image(svg.dayTimeline(sessions, day))}
                  metadata={
                    <List.Item.Detail.Metadata>
                      {[...sessions].reverse().map((s) => (
                        <List.Item.Detail.Metadata.Label
                          key={s.id}
                          title={`${hhmm(s.endedAt - s.focusedMs)} to ${hhmm(s.endedAt)}`}
                          text={`${s.label || "Untitled"}  ${duration(s.focusedMs)}`}
                          icon={
                            s.completed
                              ? { source: Icon.CheckCircle, tintColor: Color.Red }
                              : { source: Icon.MinusCircle, tintColor: Color.SecondaryText }
                          }
                        />
                      ))}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  {startActions("focus")}
                  <ActionPanel.Section>
                    <ActionPanel.Submenu title="Focus Again on" icon={Icon.RotateClockwise}>
                      {[...new Set(sessions.map((s) => s.label).filter(Boolean))].map((l) => (
                        <Action key={l} title={l} onAction={() => start("focus", l)} />
                      ))}
                    </ActionPanel.Submenu>
                    <ActionPanel.Submenu
                      title="Delete Session"
                      icon={Icon.Trash}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                    >
                      {sessions.map((s) => (
                        <Action
                          key={s.id}
                          title={`${hhmm(s.endedAt - s.focusedMs)}  ${s.label || "Untitled"}`}
                          onAction={() => removeSession(s.id)}
                        />
                      ))}
                    </ActionPanel.Submenu>
                  </ActionPanel.Section>
                  {historyActions}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { JSX, useCallback, useEffect, useRef, useState } from "react";
import { PresetForm, TaskNameForm } from "./components/preset-form";
import { StatsView } from "./components/stats-view";
import {
  endsAt,
  HistoryEntry,
  Phase,
  PHASE_NAMES,
  progress,
  remainingMs,
  TimerState,
  upcomingPhase,
} from "./lib/engine";
import { formatClock, formatDuration, formatTime } from "./lib/format";
import { isWindows, testAlarm } from "./lib/notify";
import {
  deletePreset,
  getDefaultPresetId,
  loadPresets,
  movePreset,
  newPresetId,
  Preset,
  setDefaultPreset,
  setPresetTaskName,
  upsertPreset,
} from "./lib/presets";
import { getPrefs } from "./lib/prefs";
import { computeStats } from "./lib/stats";
import {
  clearViewOpen,
  configFor,
  discardTimer,
  loadHistory,
  markViewOpen,
  pauseTimer,
  reconcile,
  resetCycle,
  restartTimer,
  resumeTimer,
  setLabel,
  skipInterval,
  startFocus,
  startNext,
  startPhase,
  stopTimer,
} from "./lib/timer";

const PHASE_COLOR: Record<Phase, Color> = { focus: Color.Red, shortBreak: Color.Green, longBreak: Color.Blue };

const key = (k: Keyboard.KeyEquivalent, shift = false): Keyboard.Shortcut => ({
  macOS: { modifiers: shift ? ["cmd", "shift"] : ["cmd"], key: k },
  Windows: { modifiers: shift ? ["ctrl", "shift"] : ["ctrl"], key: k },
});

function bar(fraction: number, width = 12): string {
  const filled = Math.round(Math.min(1, Math.max(0, fraction)) * width);
  return "●".repeat(filled) + "○".repeat(width - filled);
}

function until(s: TimerState): string {
  const end = endsAt(s);
  return end ? ` · until ${formatTime(end)}` : "";
}

export default function Command() {
  const prefs = getPrefs();
  const [state, setState] = useState<TimerState>();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [defaultId, setDefaultId] = useState<string>();
  const [now, setNow] = useState(() => Date.now());
  const [task, setTask] = useState("");
  // Follows the user's selection so the once-a-second refresh never yanks it away.
  const [selectedId, setSelectedId] = useState<string>();
  const busy = useRef(false);
  /** Newest completed interval we've already told the user about (set on first load). */
  const lastAnnounced = useRef<number | undefined>(undefined);

  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const result = await reconcile();
      const [h, p, d] = await Promise.all([loadHistory(), loadPresets(), getDefaultPresetId()]);
      setState(result.state);
      setHistory(h);
      setPresets(p);
      setDefaultId(d);
      setNow(Date.now());

      // Announce intervals that ended while the window is open, whoever finalized them (this window
      // or the background alarm). An in-window toast keeps the window open, unlike a HUD.
      const newest = h.filter((e) => e.completed).reduce((max, e) => Math.max(max, e.endedAt), 0);
      if (lastAnnounced.current === undefined) {
        lastAnnounced.current = newest;
      } else if (newest > lastAnnounced.current) {
        lastAnnounced.current = newest;
        const ended = h.find((e) => e.completed && e.endedAt === newest)!;
        const done = ended.phase === "focus" ? "🍅 Focus complete" : `☕ ${PHASE_NAMES[ended.phase]} over`;
        const s = result.state;
        const after =
          s.status === "running"
            ? `${PHASE_NAMES[s.phase]} started`
            : `next: ${PHASE_NAMES[upcomingPhase(s, configFor(s))]}`;
        await showToast({ style: Toast.Style.Success, title: done, message: after });
      }
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    // Tell background runs this window is open, so they don't show a HUD (which would close it).
    markViewOpen();
    refresh();
    let ticks = 0;
    const tick = setInterval(() => {
      setNow(Date.now());
      ticks++;
      if (ticks % 2 === 0) markViewOpen();
      // Pick up changes made in the background (alarm, Quick Toggle hotkey) every few seconds.
      if (ticks % 3 === 0) refresh();
    }, 1000);
    return () => {
      clearInterval(tick);
      clearViewOpen();
    };
  }, [refresh]);

  // Finalize the interval the moment it hits zero while the window is open.
  useEffect(() => {
    if (state?.status === "running" && remainingMs(state, now) <= 0) refresh();
  }, [now, state, refresh]);

  if (!state) return <List isLoading filtering={false} searchText={task} onSearchTextChange={setTask} />;

  /** Do something and confirm it with a toast inside the window — Raycast stays open. */
  const act = async (fn: () => Promise<TimerState>, message: (s: TimerState) => string) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Working…" });
    const next = await fn();
    setTask("");
    setSelectedId(undefined);
    await refresh();
    toast.style = Toast.Style.Success;
    toast.title = message(next);
  };

  const typed = task.trim();
  const stats = computeStats(history, now);
  const cfg = configFor(state, prefs);
  const remaining = remainingMs(state, now);
  const next = upcomingPhase(state, cfg);
  const active = state.status === "running" || state.status === "paused";
  const defaultPreset = presets.find((p) => p.id === defaultId) ?? presets[0];
  const goalReached = stats.todayCount >= prefs.dailyGoal;

  const startWith = (preset: Preset, label?: string) =>
    act(
      () => startFocus(label, preset.id),
      (s) => `${preset.icon} ${s.label ?? preset.name} started${until(s)}`,
    );

  // ---------- actions shared by every row ----------
  const commonActions = (
    <ActionPanel.Section>
      <Action.Push title="View Stats & History" icon={Icon.BarChart} shortcut={key("y")} target={<StatsView />} />
      <Action.Push
        title="New Focus Preset"
        icon={Icon.Plus}
        shortcut={key("n", true)}
        target={<PresetForm onSaved={refresh} />}
      />
      <ActionPanel.Submenu title="Settings" icon={Icon.Gear}>
        {isWindows && (
          <Action
            title="Test Alarm Sound & Notification"
            icon={Icon.Bell}
            onAction={async () => {
              const toast = await showToast({ style: Toast.Style.Animated, title: "Sending test alarm…" });
              const problem = await testAlarm(prefs);
              if (problem) {
                toast.style = Toast.Style.Failure;
                toast.title = "Alarm didn't run";
                toast.message = problem;
              } else {
                toast.style = Toast.Style.Success;
                toast.title = "Alarm ran";
                toast.message = "No popup? Allow notifications for “Windows PowerShell” in Windows Settings.";
              }
            }}
          />
        )}
        {state.cycleCount > 0 && (
          <Action
            title="Reset Cycle Count"
            icon={Icon.ArrowCounterClockwise}
            onAction={async () => {
              await resetCycle();
              await refresh();
              await showToast({ style: Toast.Style.Success, title: "Cycle reset" });
            }}
          />
        )}
        <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </ActionPanel.Submenu>
    </ActionPanel.Section>
  );

  // ---------- 1. stats, always on top ----------
  const statsRow = (
    <List.Section title="Today">
      <List.Item
        id="stats"
        icon={getProgressIcon(Math.min(1, stats.todayCount / prefs.dailyGoal), goalReached ? Color.Green : Color.Red)}
        title={`${stats.todayCount} of ${prefs.dailyGoal} pomodoros`}
        subtitle={`${bar(stats.todayCount / prefs.dailyGoal)}  ${goalReached ? "Goal reached 🎉" : ""}`}
        accessories={[
          { text: formatDuration(stats.todayFocusMs), icon: Icon.Clock, tooltip: "Focused today" },
          { text: `${stats.weekCount} this week`, icon: Icon.Calendar },
          ...(stats.streakDays > 0 ? [{ text: `${stats.streakDays}-day streak`, icon: Icon.Bolt }] : []),
        ]}
        actions={
          <ActionPanel>
            <Action.Push title="View Stats & History" icon={Icon.BarChart} target={<StatsView />} />
            {commonActions}
          </ActionPanel>
        }
      />
    </List.Section>
  );

  // ---------- 2. type a task + Enter ----------
  const typedRow = typed && defaultPreset && (
    <List.Section title="Start">
      <List.Item
        id="start-typed"
        icon={{ source: Icon.Play, tintColor: Color.Red }}
        title={`Start “${typed}”`}
        subtitle={`${defaultPreset.icon} ${defaultPreset.name} · ${defaultPreset.focusMinutes} min`}
        accessories={active ? [{ tag: { value: "Replaces current timer", color: Color.Orange } }] : []}
        actions={
          <ActionPanel>
            <Action title={`Start “${typed}”`} icon={Icon.Play} onAction={() => startWith(defaultPreset, typed)} />
            {active && typed !== state.label && (
              <Action
                title="Rename Current Task Instead"
                icon={Icon.Pencil}
                shortcut={key("t")}
                onAction={() =>
                  act(
                    () => setLabel(typed),
                    () => `✏️ Now working on: ${typed}`,
                  )
                }
              />
            )}
            {commonActions}
          </ActionPanel>
        }
      />
    </List.Section>
  );

  // ---------- 3. the current timer ----------
  let timerRow: JSX.Element | null = null;
  if (active || state.status === "finished") {
    const presetLabel = state.preset ? `${state.preset.icon} ${state.preset.name}` : "";
    const cycle = `${Math.min(state.cycleCount, cfg.longBreakEvery)}/${cfg.longBreakEvery}`;
    const name = state.label || PHASE_NAMES[state.phase];

    let title: string;
    let subtitle: string;
    let icon: List.Item.Props["icon"];
    const accessories: List.Item.Accessory[] = [];
    let primary: JSX.Element;

    if (state.status === "finished") {
      title = `${PHASE_NAMES[state.phase]} complete`;
      subtitle = `Up next: ${PHASE_NAMES[next]}`;
      icon = { source: Icon.CheckCircle, tintColor: Color.Green };
      primary = (
        <Action
          title={`Start ${PHASE_NAMES[next]}`}
          icon={Icon.Play}
          onAction={() => act(startNext, (s) => `▶ ${PHASE_NAMES[s.phase]} started${until(s)}`)}
        />
      );
    } else {
      title = `${formatClock(remaining)}   ${name}`;
      subtitle = state.label ? `${PHASE_NAMES[state.phase]} · ${presetLabel}` : presetLabel;
      icon = getProgressIcon(progress(state, now), PHASE_COLOR[state.phase]);
      if (state.status === "paused") {
        accessories.push({ tag: { value: "Paused", color: Color.Orange } });
        primary = (
          <Action title="Resume" icon={Icon.Play} onAction={() => act(resumeTimer, (s) => `▶ Resumed${until(s)}`)} />
        );
      } else {
        accessories.push({ text: `ends ${formatTime(now + remaining)}`, icon: Icon.Clock });
        primary = (
          <Action
            title="Pause"
            icon={Icon.Pause}
            onAction={() => act(pauseTimer, (s) => `⏸ Paused · ${formatClock(remainingMs(s, Date.now()))} left`)}
          />
        );
      }
    }
    accessories.push({ tag: { value: `🍅 ${cycle}`, color: Color.Red }, tooltip: "Focus sessions toward long break" });

    const stopAction = (
      <Action
        key="stop"
        title="Stop and Keep Time"
        icon={Icon.Stop}
        shortcut={{
          macOS: { modifiers: ["cmd"], key: "backspace" },
          Windows: { modifiers: ["ctrl"], key: "backspace" },
        }}
        onAction={() => act(stopTimer, () => "⏹ Stopped · time kept in today's stats")}
      />
    );
    const discardAction = (
      <Action
        key="discard"
        title="Discard Session"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "backspace" },
          Windows: { modifiers: ["ctrl", "shift"], key: "backspace" },
        }}
        onAction={() => act(discardTimer, () => "🗑 Session discarded")}
      />
    );

    timerRow = (
      <List.Section title="Now">
        <List.Item
          id="timer"
          title={title}
          subtitle={subtitle}
          icon={icon}
          accessories={accessories}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                {primary}
                {state.status !== "finished" && (
                  <Action
                    title={`Skip to ${PHASE_NAMES[next]}`}
                    icon={Icon.Forward}
                    shortcut={key("n")}
                    onAction={() => act(skipInterval, (s) => `⏭ ${PHASE_NAMES[s.phase]} started${until(s)}`)}
                  />
                )}
                {active && (
                  <Action
                    title="Restart"
                    icon={Icon.RotateClockwise}
                    shortcut={key("r")}
                    onAction={() => act(restartTimer, (s) => `↻ Restarted${until(s)}`)}
                  />
                )}
                <Action
                  title="Short Break"
                  icon={Icon.Mug}
                  shortcut={key("b")}
                  onAction={() =>
                    act(
                      () => startPhase("shortBreak"),
                      (s) => `☕ Short break${until(s)}`,
                    )
                  }
                />
                <Action
                  title="Long Break"
                  icon={Icon.Leaf}
                  shortcut={key("b", true)}
                  onAction={() =>
                    act(
                      () => startPhase("longBreak"),
                      (s) => `🌿 Long break${until(s)}`,
                    )
                  }
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                {stopAction}
                {discardAction}
              </ActionPanel.Section>
              {commonActions}
            </ActionPanel>
          }
        />
        <List.Item
          id="end"
          title={state.status === "finished" ? "Clear" : "End Session"}
          subtitle={
            state.status === "finished"
              ? "Go back to idle"
              : "Enter: stop and keep time · Ctrl+Shift+Backspace: discard (won't count)"
          }
          icon={{ source: Icon.Stop, tintColor: Color.SecondaryText }}
          actions={
            <ActionPanel>
              {stopAction}
              {state.status !== "finished" && discardAction}
              {commonActions}
            </ActionPanel>
          }
        />
      </List.Section>
    );
  }

  // ---------- 4. focus presets ----------
  const presetRows = (
    <List.Section
      title="Focus Presets"
      subtitle={
        typed
          ? `Enter starts “${typed}” · Ctrl+T saves it as the preset's task`
          : "Enter to start · Ctrl+T name its task · Ctrl+E edit"
      }
    >
      {presets.map((p, i) => {
        const isDefault = p.id === defaultPreset?.id;
        const isActive = active && state.preset?.id === p.id;
        const startLabel = typed || p.taskName;
        return (
          <List.Item
            key={p.id}
            id={`preset-${p.id}`}
            title={`${p.icon}  ${p.name}`}
            subtitle={
              p.taskName
                ? `${p.taskName} · ${p.focusMinutes}/${p.shortBreakMinutes} min`
                : `${p.focusMinutes} min focus · ${p.shortBreakMinutes} min break`
            }
            accessories={[
              ...(isActive ? [{ tag: { value: "Running", color: PHASE_COLOR[state.phase] } }] : []),
              ...(isDefault ? [{ tag: { value: "Default", color: Color.SecondaryText } }] : []),
              ...(p.taskName ? [] : [{ text: "no task name", tooltip: "Ctrl+T to name what this preset is for" }]),
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title={startLabel ? `Start “${startLabel}”` : `Start ${p.name}`}
                    icon={Icon.Play}
                    onAction={() => startWith(p, typed || undefined)}
                  />
                  {typed ? (
                    <Action
                      title={`Set Task Name to “${typed}”`}
                      icon={Icon.Tag}
                      shortcut={key("t")}
                      onAction={async () => {
                        await setPresetTaskName(p.id, typed);
                        setTask("");
                        setSelectedId(`preset-${p.id}`);
                        await refresh();
                        await showToast({ style: Toast.Style.Success, title: `${p.icon} ${p.name} → ${typed}` });
                      }}
                    />
                  ) : (
                    <Action.Push
                      title={p.taskName ? "Rename Task" : "Set Task Name"}
                      icon={Icon.Tag}
                      shortcut={key("t")}
                      target={<TaskNameForm preset={p} onSaved={refresh} />}
                    />
                  )}
                  <Action.Push
                    title="Edit Preset"
                    icon={Icon.Pencil}
                    shortcut={key("e")}
                    target={<PresetForm preset={p} onSaved={refresh} />}
                  />
                  {presets.length > 1 && (
                    <Action
                      title="Delete Preset"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{
                        macOS: { modifiers: ["cmd"], key: "backspace" },
                        Windows: { modifiers: ["ctrl"], key: "backspace" },
                      }}
                      onAction={async () => {
                        const ok = await confirmAlert({
                          title: `Delete “${p.name}”?`,
                          message: "Your history is kept.",
                          primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                        });
                        if (!ok) return;
                        await deletePreset(p.id);
                        await refresh();
                        await showToast({ style: Toast.Style.Success, title: `Deleted ${p.name}` });
                      }}
                    />
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  {!isDefault && (
                    <Action
                      title="Make Default"
                      icon={Icon.Star}
                      shortcut={key("d")}
                      onAction={async () => {
                        await setDefaultPreset(p.id);
                        await refresh();
                        await showToast({ style: Toast.Style.Success, title: `${p.name} is now your default` });
                      }}
                    />
                  )}
                  <Action
                    title="Duplicate Preset"
                    icon={Icon.CopyClipboard}
                    onAction={async () => {
                      await upsertPreset({ ...p, id: newPresetId(p.name), name: `${p.name} Copy` });
                      await refresh();
                    }}
                  />
                  {i > 0 && (
                    <Action
                      title="Move Earlier"
                      icon={Icon.ArrowUp}
                      shortcut={{
                        macOS: { modifiers: ["cmd", "opt"], key: "arrowUp" },
                        Windows: { modifiers: ["ctrl", "alt"], key: "arrowUp" },
                      }}
                      onAction={async () => {
                        await movePreset(p.id, -1);
                        await refresh();
                      }}
                    />
                  )}
                  {i < presets.length - 1 && (
                    <Action
                      title="Move Later"
                      icon={Icon.ArrowDown}
                      shortcut={{
                        macOS: { modifiers: ["cmd", "opt"], key: "arrowDown" },
                        Windows: { modifiers: ["ctrl", "alt"], key: "arrowDown" },
                      }}
                      onAction={async () => {
                        await movePreset(p.id, 1);
                        await refresh();
                      }}
                    />
                  )}
                </ActionPanel.Section>
                {commonActions}
              </ActionPanel>
            }
          />
        );
      })}
      <List.Item
        id="new-preset"
        title="New Preset…"
        subtitle="Set your own focus and break lengths"
        icon={{ source: Icon.Plus, tintColor: Color.SecondaryText }}
        actions={
          <ActionPanel>
            <Action.Push title="New Focus Preset" icon={Icon.Plus} target={<PresetForm onSaved={refresh} />} />
            {commonActions}
          </ActionPanel>
        }
      />
    </List.Section>
  );

  const fallbackSelection = typed ? "start-typed" : timerRow ? "timer" : `preset-${defaultPreset?.id}`;

  const onSearchTextChange = (text: string) => {
    const nowTyping = text.trim().length > 0;
    const wasTyping = task.trim().length > 0;
    // Jump to "Start …" when you begin typing, and back to the default spot when you clear it.
    if (nowTyping && !wasTyping) setSelectedId("start-typed");
    if (!nowTyping && wasTyping) setSelectedId(undefined);
    setTask(text);
  };

  return (
    <List
      filtering={false}
      searchText={task}
      onSearchTextChange={onSearchTextChange}
      selectedItemId={selectedId ?? fallbackSelection}
      onSelectionChange={(id) => id && setSelectedId(id)}
      searchBarPlaceholder={
        active ? "Type a new task and press Enter to switch to it" : "What are you working on? Type it and press Enter"
      }
      navigationTitle="Pomodoro"
    >
      {statsRow}
      {typedRow}
      {timerRow}
      {presetRows}
    </List>
  );
}

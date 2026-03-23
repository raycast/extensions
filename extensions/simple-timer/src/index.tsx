import { useState, useEffect, useCallback, useRef } from "react";
import {
  Grid,
  List,
  Action,
  ActionPanel,
  Icon,
  LocalStorage,
  useNavigation,
  Color,
  showHUD,
  Detail,
  Form,
  environment,
} from "@raycast/api";
import {
  parseFullInput,
  parseInputLabel,
  formatLabel,
  isStopwatchInput,
  parseStopwatchNote,
  isPomodoroKeyword,
  parsePomodoroInput,
  generateSuggestions,
  getVolume,
  setVolume,
  getSound,
  setSound,
  SOUND_OPTIONS,
  getPresets,
  getAlertDuration,
  setAlertDuration,
  ALERT_DURATION_OPTIONS,
  getNotificationsEnabled,
  setNotificationsEnabled,
} from "./utils";
import {
  startTimer as startTimerBg,
  startStopwatch,
  startPomodoro,
  getActiveTimers,
  getDoneTimers,
  getHistory,
  killAllTimers,
  setNotificationsInState,
} from "./timer-state";
import type { HistoryEntry } from "./timer-state";
import { StopwatchRunning } from "./stopwatch-running";
import { PomodoroRunning } from "./pomodoro-running";
import { stopAllAlertSounds, previewSound } from "./sound";
import { ActiveTimers } from "./active-timers";
import { FinishedTimers } from "./finished-timers";
import { HistoryTimers } from "./history-timers";
import { TimerRunning } from "./timer-running";
import { PresetSettings } from "./preset-settings";

const RECENT_KEY = "recent-timers";
const VOLUME_OPTIONS = [1, 10, 25, 50, 75, 100];

async function loadRecent(): Promise<number[]> {
  const raw = await LocalStorage.getItem<string>(RECENT_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as number[];
  } catch {
    return [];
  }
}

async function saveRecent(seconds: number): Promise<void> {
  const existing = await loadRecent();
  const updated = [seconds, ...existing.filter((s) => s !== seconds)].slice(
    0,
    3,
  );
  await LocalStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}

function AlertDurationForm({ current, onSave }: { current: number; onSave: (v: number) => void }) {
  const { pop } = useNavigation();
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | undefined>();

  function handleSubmit() {
    const { parseInput } = require("./utils");
    const parsed = parseInput(input);
    if (!parsed || parsed <= 0) {
      setError("Invalid duration – try '30s', '2m', '1 minute'");
      return;
    }
    onSave(parsed);
    pop();
  }

  return (
    <Form
      navigationTitle="Custom Alert Duration"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Current: ${current === 0 ? "Until dismissed" : current + "s"}`} />
      <Form.TextField
        id="duration"
        title="Duration"
        placeholder="e.g. 30s · 2m · 1 minute"
        value={input}
        error={error}
        onChange={(v) => { setInput(v); setError(undefined); }}
      />
    </Form>
  );
}

function SoundPreview({ volume }: { volume: number }) {
  return (
    <List navigationTitle="Sound Preview">
      {SOUND_OPTIONS.filter((s) => s.id !== "").map((s) => (
        <List.Item
          key={s.id}
          icon={Icon.Music}
          title={s.label}
          subtitle="↵ to preview"
          actions={
            <ActionPanel>
              <Action
                title={`Preview ${s.label}`}
                icon={Icon.Play}
                onAction={() => {
                  const wavPath = require("path").join(environment.assetsPath, s.id);
                  previewSound(wavPath, volume);
                  showHUD(`▶ Playing ${s.label}`);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function PomodoroSetup({ volume, sound, alertDuration, onStart }: { volume: number; sound: string; alertDuration: number; onStart?: () => void }) {
  const { push, pop } = useNavigation();
  const [workInput, setWorkInput] = useState("25m");
  const [breakInput, setBreakInput] = useState("5m");
  const [cyclesInput, setCyclesInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [workError, setWorkError] = useState<string | undefined>();
  const [breakError, setBreakError] = useState<string | undefined>();
  const [cyclesError, setCyclesError] = useState<string | undefined>();

  function handleStart() {
    const { parseFullInput } = require("./utils");
    const work = parseFullInput(workInput)?.seconds;
    const brk = parseFullInput(breakInput)?.seconds;
    if (!work) { setWorkError("Invalid duration"); return; }
    if (!brk) { setBreakError("Invalid duration"); return; }
    const maxCycles = cyclesInput ? parseInt(cyclesInput) : 0;
    if (cyclesInput && (isNaN(maxCycles) || maxCycles < 1)) { setCyclesError("Enter a number ≥ 1, or leave empty for infinite"); return; }
    const entry = startPomodoro({ workSeconds: work, breakSeconds: brk, note: noteInput, soundFile: sound, volume, alertDuration, maxCycles });
    onStart?.();
    pop();
    push(<PomodoroRunning pomodoroId={entry.id} />);
  }

  return (
    <Form
      navigationTitle="Pomodoro Setup"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Pomodoro" onSubmit={handleStart} />
        </ActionPanel>
      }
    >
      <Form.TextField id="work" title="Work interval" placeholder="e.g. 25m" value={workInput} error={workError} onChange={(v) => { setWorkInput(v); setWorkError(undefined); }} />
      <Form.TextField id="brk" title="Break interval" placeholder="e.g. 5m" value={breakInput} error={breakError} onChange={(v) => { setBreakInput(v); setBreakError(undefined); }} />
      <Form.TextField id="cycles" title="Cycles (optional)" placeholder="e.g. 4 — leave empty for infinite" value={cyclesInput} error={cyclesError} onChange={(v) => { setCyclesInput(v); setCyclesError(undefined); }} />
      <Form.TextField id="note" title="Note (optional)" placeholder="What are you working on?" value={noteInput} onChange={setNoteInput} />
    </Form>
  );
}

function InputGuide() {
  const markdown = `
# ⏱ Simple Timer – Input Guide

## Timer – Duration
| Input | Result |
|-------|--------|
| \`5m\` | 5 minutes |
| \`30s\` | 30 seconds |
| \`2h\` | 2 hours |
| \`1h30\` | 1 hour 30 minutes |
| \`30m20\` | 30 minutes 20 seconds |
| \`25 minutes\` | 25 minutes |

## Timer – Target time
| Input | Result |
|-------|--------|
| \`@18:00\` | timer until 18:00 |
| \`@6pm\` | timer until 6 PM |
| \`@6:30pm\` | timer until 6:30 PM |
| \`at 18:00\` | same as @18:00 |

## Timer – With note
| Input | Note | Time |
|-------|------|------|
| \`send email 5m\` | send email | 5 min |
| \`5m send email\` | send email | 5 min |
| \`laundry @18:00\` | laundry | until 18:00 |

> A bare number like \`3\` is text, not time. Use \`3m\`, \`3s\`, or \`3h\`.

## Stopwatch
| Input | Result |
|-------|--------|
| \`sw\` or \`stopwatch\` | start stopwatch |

## Pomodoro
| Input | Result |
|-------|--------|
| \`pomo\` or \`pomodoro\` | open setup page |
| \`pomo:25m:5m\` | 25 min work + 5 min break |
| \`pomo:33m40s:7m30s\` | compound durations |
| \`meeting pomo:25m:5m\` | with note "meeting" |
| \`pomo:25m:5m meeting\` | same |
| \`pomo;25m;5m\` | semicolon separator also works |
  `;
  return <Detail navigationTitle="Input Guide" markdown={markdown} />;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [recent, setRecent] = useState<number[]>([]);
  const [volume, setVolumeState] = useState<number>(75);
  const [sound, setSoundState] = useState<string>("alert.wav");
  const [presets, setPresets] = useState<{ label: string; seconds: number }[]>(
    [],
  );
  const [activeCount, setActiveCount] = useState<number>(0);
  const [alertDuration, setAlertDurationState] = useState<number>(0);
  const [notificationsEnabled, setNotificationsEnabledState] = useState<boolean>(true);
  const [finishedCount, setFinishedCount] = useState<number>(0);
  const [historyCount, setHistoryCount] = useState<number>(0);
  const { push } = useNavigation();
  const soundPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadPresets = useCallback(() => {
    getPresets().then(setPresets);
  }, []);

  function refreshCounts() {
    setActiveCount(getActiveTimers().length);
    setFinishedCount(getDoneTimers().length);
    setHistoryCount(getHistory().length);
  }

  useEffect(() => {
    loadRecent().then(setRecent);
    getVolume().then(setVolumeState);
    getSound().then(setSoundState);
    loadPresets();
    refreshCounts();
    getAlertDuration().then(setAlertDurationState);
    getNotificationsEnabled().then((v) => {
      const val = v ?? true;
      setNotificationsEnabledState(val);
      setNotificationsInState(val);
    });

    if (soundPollRef.current) clearInterval(soundPollRef.current);
    soundPollRef.current = setInterval(refreshCounts, 500);

    return () => {
      if (soundPollRef.current) clearInterval(soundPollRef.current);
    };
  }, []);

  const parsedFull = parseFullInput(searchText);
  const parsed = parsedFull?.seconds ?? null;
  const parsedNote = parsedFull?.note ?? "";

  function repeatHistoryEntry(e: HistoryEntry) {
    if (e.label.startsWith("Pomodoro ") && e.pomodoroBreakSeconds) {
      startPomodoro({
        workSeconds: e.totalSeconds,
        breakSeconds: e.pomodoroBreakSeconds,
        note: e.note,
        soundFile: sound,
        volume,
        alertDuration,
        maxCycles: e.pomodoroMaxCycles ?? 0,
      });
      refreshCounts();
      showHUD(`▶ Pomodoro started`);
      return;
    }
    // For regular timers - just start, don't push (we're inside history navigation)
    startTimerBg({
      totalSeconds: e.totalSeconds,
      label: formatLabel(e.totalSeconds),
      note: e.note,
      soundFile: sound,
      volume,
      alertDuration,
    });
    saveRecent(e.totalSeconds).then(() => loadRecent().then(setRecent));
    refreshCounts();
    showHUD(`▶ ${formatLabel(e.totalSeconds)} started`);
  }

  function startTimer(seconds: number, note = "") {
    saveRecent(seconds).then(() => loadRecent().then(setRecent));
    const entry = startTimerBg({
      totalSeconds: seconds,
      label: formatLabel(seconds),
      note,
      soundFile: sound,
      volume,
      alertDuration,
    });
    refreshCounts();
    setSearchText("");
    push(<TimerRunning timerId={entry.id} />);
  }

  async function changeVolume(v: number) {
    setVolumeState(v);
    await setVolume(v);
  }
  async function changeSound(id: string) {
    setSoundState(id);
    await setSound(id);
  }

  async function changeAlertDuration(v: number) {
    setAlertDurationState(v);
    await setAlertDuration(v);
  }

  async function changeNotifications(v: boolean) {
    setNotificationsEnabledState(v);
    await setNotificationsEnabled(v);
    setNotificationsInState(v);
  }

  const currentSoundLabel =
    SOUND_OPTIONS.find((s) => s.id === sound)?.label ?? "Classic";
  const currentAlertDurationLabel =
    ALERT_DURATION_OPTIONS.find((o) => o.seconds === alertDuration)?.label ?? "Until dismissed";

  function makeActions(seconds: number, note = "", primaryAction?: () => void, primaryTitle?: string, primaryIcon?: string) {
    return (
      <ActionPanel>
        <Action
          title={primaryTitle ?? `Start ${formatLabel(seconds)}`}
          icon={primaryIcon ? { source: primaryIcon } : undefined}
          onAction={primaryAction ?? (() => startTimer(seconds, note))}
        />
        <Action
          title="Preset Settings"
          icon={Icon.Gear}
          onAction={() =>
            push(<PresetSettings onPresetsChanged={loadPresets} />)
          }
        />
        <Action
          title="History"
          icon={Icon.Clock}
          shortcut={{ modifiers: ["ctrl"], key: "h" }}
          onAction={() => push(<HistoryTimers onRefresh={refreshCounts} autoPop={false} onRepeatTimer={(e) => repeatHistoryEntry(e)} />)}
        />
        <Action
          title="Input Guide"
          icon={Icon.QuestionMark}
          onAction={() => push(<InputGuide />)}
        />
        <ActionPanel.Section title="Quick Start Presets">
          {presets.map((p, i) => (
            <Action
              key={`quick-${i}`}
              title={`Start ${p.label}`}
              icon={{ source: Icon.Stopwatch, tintColor: Color.Blue }}
              shortcut={{
                modifiers: ["ctrl"],
                key: `${i + 1}` as
                  | "1"
                  | "2"
                  | "3"
                  | "4"
                  | "5"
                  | "6"
                  | "7"
                  | "8"
                  | "9",
              }}
              onAction={() => startTimer(p.seconds, "")}
            />
          ))}
          {recent.length > 0 && (
            <Action
              title={`Repeat Last: ${formatLabel(recent[0])}`}
              icon={{
                source: Icon.ArrowCounterClockwise,
                tintColor: Color.SecondaryText,
              }}
              shortcut={{ modifiers: ["ctrl"], key: "r" }}
              onAction={() => startTimer(recent[0], "")}
            />
          )}
        </ActionPanel.Section>
        <ActionPanel.Section>
          <ActionPanel.Submenu title={`Volume: ${volume}%`} icon={Icon.Speaker}>
            {VOLUME_OPTIONS.map((v) => (
              <Action
                key={`vol-${v}`}
                title={`${v}%${v === volume ? " ✓" : ""}`}
                onAction={() => changeVolume(v)}
              />
            ))}
          </ActionPanel.Submenu>
          <ActionPanel.Submenu
            title={`Sound: ${currentSoundLabel}`}
            icon={Icon.Music}
          >
            {SOUND_OPTIONS.map((s) => (
              <Action
                key={s.id}
                title={`${s.label}${s.id === sound ? " ✓" : ""}`}
                onAction={() => changeSound(s.id)}
              />
            ))}
            <ActionPanel.Section>
              <ActionPanel.Submenu
                title={`Duration: ${currentAlertDurationLabel}`}
                icon={Icon.Clock}
              >
                {ALERT_DURATION_OPTIONS.map((o) => (
                  <Action
                    key={`dur-${o.seconds}`}
                    title={`${o.label}${o.seconds === alertDuration ? " ✓" : ""}`}
                    onAction={() => changeAlertDuration(o.seconds)}
                  />
                ))}
                <Action
                  title="Custom..."
                  icon={Icon.Pencil}
                  onAction={() => push(<AlertDurationForm current={alertDuration} onSave={changeAlertDuration} />)}
                />
              </ActionPanel.Submenu>
              <Action
                title="Sound Preview..."
                icon={Icon.Play}
                onAction={() => push(<SoundPreview volume={volume} />)}
              />
            </ActionPanel.Section>
          </ActionPanel.Submenu>
          <ActionPanel.Submenu
            title={notificationsEnabled ? "Notifications: On" : "Notifications: Off"}
            icon={notificationsEnabled ? Icon.Bell : Icon.BellDisabled}
          >
            <Action
              title={notificationsEnabled ? "On ✓" : "On"}
              onAction={() => changeNotifications(true)}
            />
            <Action
              title={notificationsEnabled ? "Off" : "Off ✓"}
              onAction={() => changeNotifications(false)}
            />
          </ActionPanel.Submenu>
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action
            title="Kill All Timers & Sound"
            icon={Icon.XMarkCircle}
            style={Action.Style.Destructive}
            onAction={() => {
              stopAllAlertSounds();
              killAllTimers();
              refreshCounts();
              showHUD("🔇 All timers and sounds stopped");
            }}
          />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action
            title="Delete Recent"
            icon={Icon.Trash}
            style={
              recent.length > 0
                ? Action.Style.Destructive
                : Action.Style.Regular
            }
            shortcut={{ modifiers: ["ctrl"], key: "d" }}
            onAction={async () => {
              if (recent.length === 0) {
                showHUD("No recent timers");
                return;
              }
              await LocalStorage.removeItem(RECENT_KEY);
              setRecent([]);
            }}
          />
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  // Typing mode → List
  if (searchText) {
    return (
      <List
        searchBarPlaceholder="5m · 1h30 · @18:00 · or: send email 5m"
        onSearchTextChange={setSearchText}
        throttle={false}
      >
        {isPomodoroKeyword(searchText) ? (() => {
          const parsed = parsePomodoroInput(searchText);
          if (parsed === "setup" || parsed === null) {
            return (
              <List.Section title="Pomodoro">
                <List.Item
                  icon={{ source: Icon.Clock, tintColor: Color.Red }}
                  title="Start Pomodoro"
                  subtitle={parsed === null ? "Invalid format — try [pomo:25m:5m]" : "↵ to configure"}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Configure Pomodoro"
                        icon={Icon.Clock}
                        onAction={() => push(<PomodoroSetup volume={volume} sound={sound} alertDuration={alertDuration} onStart={() => setSearchText("")} />)}
                      />
                    </ActionPanel>
                  }
                />
              </List.Section>
            );
          }
          return (
            <List.Section title="Pomodoro">
              <List.Item
                icon={{ source: Icon.Clock, tintColor: Color.Red }}
                title={`Pomodoro: ${formatLabel(parsed.workSeconds)} work + ${formatLabel(parsed.breakSeconds)} break${parsed.maxCycles ? ` · ${parsed.maxCycles} cycles` : ""}`}
                subtitle={parsed.note ? `📝 ${parsed.note}` : "↵ to start"}
                actions={
                  <ActionPanel>
                    <Action
                      title="Start Pomodoro"
                      icon={Icon.Clock}
                      onAction={() => {
                        const entry = startPomodoro({ workSeconds: parsed.workSeconds, breakSeconds: parsed.breakSeconds, note: parsed.note, soundFile: sound, volume, alertDuration, maxCycles: parsed.maxCycles ?? 0 });
                        refreshCounts();
                        setSearchText("");
                        push(<PomodoroRunning pomodoroId={entry.id} />);
                      }}
                    />
                  </ActionPanel>
                }
              />
            </List.Section>
          );
        })() : isStopwatchInput(searchText) ? (() => {
            const swNote = parseStopwatchNote(searchText);
            return (
              <List.Section title="Stopwatch">
                <List.Item
                  icon={{ source: Icon.Stopwatch, tintColor: Color.Blue }}
                  title="Start Stopwatch"
                  subtitle={swNote ? `📝 ${swNote}` : "↵ to start"}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Start Stopwatch"
                        icon={Icon.Stopwatch}
                        onAction={() => {
                          const entry = startStopwatch(swNote);
                          refreshCounts();
                          setSearchText("");
                          push(<StopwatchRunning stopwatchId={entry.id} />);
                        }}
                      />
                    </ActionPanel>
                  }
                />
              </List.Section>
            );
          })() : parsed !== null ? (
          <List.Section title="Custom">
            <List.Item
              icon={{ source: Icon.Clock, tintColor: Color.Blue }}
              title={`Start: ${parseInputLabel(searchText) ?? formatLabel(parsed)}`}
              subtitle={parsedNote ? `📝 ${parsedNote}` : "↵ to start"}
              actions={makeActions(parsed, parsedNote)}
            />
          </List.Section>
        ) : (() => {
            const suggestions = generateSuggestions(searchText);
            if (suggestions.length > 0) {
              return (
                <List.Section title="Suggestions">
                  {suggestions.map((s) => (
                    <List.Item
                      key={`sug-${s.seconds}`}
                      icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
                      title={`Start: ${s.label}`}
                      subtitle="↵ to start"
                      actions={makeActions(s.seconds)}
                    />
                  ))}
                </List.Section>
              );
            }
            return (
              <List.EmptyView
                icon={Icon.QuestionMark}
                title="Can't parse that time"
                description={'Try "5m", "1h30", "sw" for stopwatch, or "pomo:25m:5m" for pomodoro'}
              />
            );
          })()}
      </List>
    );
  }

  return (
    <Grid
      searchBarPlaceholder="5m · 1h30 · @18:00 · or: send email 5m"
      onSearchTextChange={setSearchText}
      columns={3}
      inset={Grid.Inset.Medium}
      aspectRatio="16/9"
      throttle={false}
    >
      {/* Dynamic status tiles */}
      {(finishedCount > 0 || activeCount > 0 || historyCount > 0) && (
        <Grid.Section title="Status">
          {finishedCount > 0 && (
            <Grid.Item
              content={{ source: Icon.CheckCircle, tintColor: Color.Red }}
              title={`${finishedCount} Finished`}
              actions={makeActions(0, "", () => { refreshCounts(); push(<FinishedTimers onRefresh={refreshCounts} />); }, "Open Finished Timers", Icon.CheckCircle)}
            />
          )}
          {activeCount > 0 && (
            <Grid.Item
              content={{ source: Icon.Clock, tintColor: Color.Orange }}
              title={`${activeCount} Active`}
              actions={makeActions(0, "", () => { refreshCounts(); push(<ActiveTimers onRefresh={refreshCounts} />); }, "Open Active Timers", Icon.Clock)}
            />
          )}
          {historyCount > 0 && (
            <Grid.Item
              content={{ source: Icon.List, tintColor: Color.SecondaryText }}
              title="History"
              actions={makeActions(0, "", () => push(<HistoryTimers onRefresh={refreshCounts} onRepeatTimer={(e) => repeatHistoryEntry(e)} />), "Open History", Icon.List)}
            />
          )}
        </Grid.Section>
      )}

      {recent.length > 0 && (
        <Grid.Section title="Recent">
          {recent.map((s) => (
            <Grid.Item
              key={`recent-${s}`}
              content={{
                source: Icon.ArrowCounterClockwise,
                tintColor: Color.SecondaryText,
              }}
              title={`↺ ${formatLabel(s)}`}
              actions={makeActions(s)}
            />
          ))}
        </Grid.Section>
      )}

      <Grid.Section title="Presets">
        {presets.map((p, i) => (
          <Grid.Item
            key={`preset-${i}`}
            content={{ source: Icon.Stopwatch, tintColor: Color.Blue }}
            title={p.label}
            actions={makeActions(p.seconds)}
          />
        ))}
      </Grid.Section>
    </Grid>
  );
}

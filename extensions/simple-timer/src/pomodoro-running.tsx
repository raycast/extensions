import { useEffect, useState } from "react";
import {
  Detail,
  Action,
  ActionPanel,
  Icon,
  Color,
  showHUD,
  useNavigation,
  Form,
} from "@raycast/api";
import { formatCountdown, formatLabel, getVolume, setVolume, getSound, setSound, SOUND_OPTIONS } from "./utils";
import { getNotificationsEnabled } from "./utils";
import { TimerEntry, readState, updateTimerSound, pauseTimer, resumeTimer, cancelTimer, dismissTimer, writeState, setNotificationsInState } from "./timer-state";
import { stopAlertSound } from "./sound";

const VOLUME_OPTIONS = [1, 10, 25, 50, 75, 100];

interface Props {
  pomodoroId: string;
}

export function PomodoroRunning({ pomodoroId }: Props) {
  const [timer, setTimer] = useState<TimerEntry | null>(null);
  const [volume, setVolumeState] = useState(75);
  const [sound, setSoundState] = useState("alert.wav");
  const [notificationsEnabled, setNotificationsState] = useState(true);
  const { pop, push } = useNavigation();

  function refresh() {
    const state = readState();
    const t = state.timers.find(t => t.id === pomodoroId) ?? null;
    if (!t) { pop(); return; }
    setNotificationsState(state.notificationsEnabled ?? true);
    setNotificationsState(state.notificationsEnabled ?? true);
    setTimer(prev => {
      if (!prev) return t;
      if (prev.remaining === t.remaining && prev.status === t.status && prev.pomodoroPhase === t.pomodoroPhase && prev.pomodoroCycle === t.pomodoroCycle) return prev;
      return t;
    });
  }

  useEffect(() => {
    refresh();
    getNotificationsEnabled().then((v) => setNotificationsState(v ?? true));
    const interval = setInterval(refresh, 500);
    return () => clearInterval(interval);
  }, []);

  async function handleStop() {
    stopAlertSound(pomodoroId);
    await dismissTimer(pomodoroId);
    showHUD("⏹ Pomodoro stopped");
    pop();
  }

  function handlePause() { pauseTimer(pomodoroId); refresh(); showHUD("⏸ Pomodoro paused"); }
  function handleResume() { resumeTimer(pomodoroId); refresh(); showHUD("▶ Pomodoro resumed"); }
  function toggleNotifications() {
    const next = !notificationsEnabled;
    setNotificationsState(next);
    setNotificationsInState(next);
    showHUD(next ? "🔔 Notifications on" : "🔕 Notifications off");
  }

  async function changeVolume(v: number) { setVolumeState(v); await setVolume(v); updateTimerSound(pomodoroId, sound, v); }
  function toggleNotifications() {
    const next = !notificationsEnabled;
    setNotificationsState(next);
    setNotificationsInState(next);
    showHUD(next ? "🔔 Notifications on" : "🔕 Notifications off");
  }
  async function changeSoundFn(id: string) { setSoundState(id); await setSound(id); updateTimerSound(pomodoroId, id, volume); }

  if (!timer) return <Detail markdown="Loading..." />;

  const phase = timer.pomodoroPhase ?? "work";
  const cycle = timer.pomodoroCycle ?? 1;
  const workFmt = formatLabel(timer.pomodoroWorkSeconds ?? 0);
  const breakFmt = formatLabel(timer.pomodoroBreakSeconds ?? 0);
  const phaseLabel = phase === "work" ? "Work" : "Break";
  const currentSoundLabel = SOUND_OPTIONS.find(s => s.id === sound)?.label ?? "Classic";

  const noteSection = `\n\n---\n\n${timer.note ? timer.note : "> *You can add a note via Actions (Ctrl+K).*"}`;

  let markdown: string;
  if (timer.status === "paused") {
    markdown = `<div align="center">\n\n&nbsp;\n\n# ⏸ ${formatCountdown(timer.remaining)}\n\n**${phaseLabel}** · Cycle ${cycle}\n\n&nbsp;\n\n</div>${noteSection}`;
  } else {
    markdown = `<div align="center">\n\n&nbsp;\n\n# ${formatCountdown(timer.remaining)}\n\n**${phaseLabel}** · Cycle ${cycle}\n\n&nbsp;\n\n</div>${noteSection}`;
  }

  const volumeActions = VOLUME_OPTIONS.map(v => (
    <Action key={`vol-${v}`} title={`${v}%${v === volume ? " ✓" : ""}`} onAction={() => changeVolume(v)} />
  ));
  const soundActions = SOUND_OPTIONS.map(s => (
    <Action key={s.id} title={`${s.label}${s.id === sound ? " ✓" : ""}`} onAction={() => changeSoundFn(s.id)} />
  ));

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Phase"
            text={`${phaseLabel}`}
            icon={{ source: phase === "work" ? Icon.Bolt : Icon.Circle, tintColor: phase === "work" ? Color.Red : Color.Green }}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Work" text={workFmt} icon={{ source: Icon.Clock, tintColor: Color.Red }} />
          <Detail.Metadata.Label title="Break" text={breakFmt} icon={{ source: Icon.Clock, tintColor: Color.Green }} />
          <Detail.Metadata.Label
            title="Cycles"
            text={(timer.pomodoroMaxCycles ?? 0) > 0 ? `${cycle} / ${timer.pomodoroMaxCycles}` : `${cycle} (∞)`}
            icon={{ source: Icon.ArrowCounterClockwise, tintColor: Color.Blue }}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Volume" text={`${volume}%`} icon={Icon.Speaker} />
          <Detail.Metadata.Label title="Sound" text={currentSoundLabel} icon={Icon.Music} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Notifications"
            text={notificationsEnabled ? "On" : "Off"}
            icon={{ source: notificationsEnabled ? Icon.Bell : Icon.BellDisabled, tintColor: notificationsEnabled ? Color.Green : Color.SecondaryText }}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Back" icon={Icon.ArrowLeft} onAction={pop} />
          <Action
            title="Stop Pomodoro"
            icon={{ source: Icon.Stop, tintColor: Color.Red }}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "return" }}
            onAction={handleStop}
          />
          <Action
            title={timer.status === "paused" ? "Resume" : "Pause"}
            icon={timer.status === "paused"
              ? { source: Icon.Play, tintColor: Color.Green }
              : { source: Icon.Pause, tintColor: Color.Yellow }
            }
            shortcut={{ modifiers: [], key: "space" }}
            onAction={timer.status === "paused" ? handleResume : handlePause}
          />
          <ActionPanel.Section>
            <Action
              title="Edit Cycles"
              icon={Icon.ArrowCounterClockwise}
              onAction={() => push(
                <Form
                  navigationTitle="Edit Cycles"
                  actions={
                    <ActionPanel>
                      <Action.SubmitForm
                        title="Save"
                        onSubmit={(v: { cycles: string }) => {
                          const n = v.cycles ? parseInt(v.cycles) : 0;
                          if (v.cycles && (isNaN(n) || n < 1)) { showHUD("Enter a number ≥ 1, or leave empty for infinite"); return; }
                          const state = readState();
                          const t = state.timers.find(t => t.id === pomodoroId);
                          if (t) {
                            const cur = t.pomodoroCycle ?? 1;
                            if (n > 0 && n < cur) { showHUD(`Already on cycle ${cur} — can't set lower`); return; }
                            t.pomodoroMaxCycles = n;
                            writeState(state);
                          }
                          pop();
                          refresh();
                          showHUD(n > 0 ? `Cycles set to ${n}` : "Cycles set to infinite");
                        }}
                      />
                    </ActionPanel>
                  }
                >
                  <Form.Description text={`Current cycle: ${cycle}${(timer.pomodoroMaxCycles ?? 0) > 0 ? ` / ${timer.pomodoroMaxCycles}` : " (infinite)"}`} />
                  <Form.TextField
                    id="cycles"
                    title="Max cycles"
                    placeholder="e.g. 4 — leave empty for infinite"
                    defaultValue={(timer.pomodoroMaxCycles ?? 0) > 0 ? String(timer.pomodoroMaxCycles) : ""}
                  />
                </Form>
              )}
            />
            <Action
              title={timer.note ? "Edit Note" : "Add Note"}
              icon={timer.note ? Icon.Pencil : Icon.Plus}
              onAction={() => push(
                <Form
                  navigationTitle={timer.note ? "Edit Note" : "Add Note"}
                  actions={
                    <ActionPanel>
                      <Action.SubmitForm
                        title="Save"
                        onSubmit={(v: { note: string }) => {
                          const state = readState();
                          const t = state.timers.find(t => t.id === pomodoroId);
                          if (t) { t.note = v.note; writeState(state); }
                          pop();
                          refresh();
                        }}
                      />
                    </ActionPanel>
                  }
                >
                  <Form.TextField id="note" title="Note" placeholder="What are you working on?" defaultValue={timer.note} />
                </Form>
              )}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <ActionPanel.Submenu title={`Volume: ${volume}%`} icon={Icon.Speaker}>{volumeActions}</ActionPanel.Submenu>
            <ActionPanel.Submenu title={`Sound: ${currentSoundLabel}`} icon={Icon.Music}>{soundActions}</ActionPanel.Submenu>
            <Action
              title={notificationsEnabled ? "Notifications: On ✓" : "Notifications: Off"}
              icon={notificationsEnabled ? Icon.Bell : Icon.BellDisabled}
              onAction={toggleNotifications}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

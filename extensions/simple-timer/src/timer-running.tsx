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
import { formatCountdown, setVolume, setSound, SOUND_OPTIONS } from "./utils";
import {
  TimerEntry,
  readState,
  writeState,
  updateTimerSound,
  pauseTimer,
  resumeTimer,
  cancelTimer,
  dismissTimer,
  setNotificationsInState,
} from "./timer-state";
import { stopAlertSound } from "./sound";

const VOLUME_OPTIONS = [1, 10, 25, 50, 75, 100];

interface Props {
  timerId: string;
}

export function TimerRunning({ timerId }: Props) {
  const [timer, setTimer] = useState<TimerEntry | null>(null);
  const [volume, setVolumeState] = useState(75);
  const [sound, setSoundState] = useState("alert.wav");
  const [notificationsEnabled, setNotificationsState] = useState(true);
  const { pop, push } = useNavigation();

  function refresh() {
    const state = readState();
    const t = state.timers.find((t) => t.id === timerId) ?? null;
    if (!t) {
      pop();
      return;
    }
    setNotificationsState(state.notificationsEnabled ?? true);
    // Use per-timer sound/volume from JSON
    setVolumeState(t.volume);
    setSoundState(t.soundFile);
    setTimer((prev) => {
      if (!prev) return t;
      if (
        prev.remaining === t.remaining &&
        prev.status === t.status &&
        prev.note === t.note
      )
        return prev;
      return t;
    });
  }

  useEffect(() => {
    refresh();
    const syncInterval = setInterval(refresh, 500);
    return () => clearInterval(syncInterval);
  }, []);

  async function handleDismiss() {
    stopAlertSound(timerId);
    await dismissTimer(timerId);
    showHUD("✅ Timer dismissed");
    pop();
  }

  function handleCancel() {
    stopAlertSound(timerId);
    cancelTimer(timerId);
    showHUD("❌ Timer cancelled");
    pop();
  }

  function handlePause() {
    pauseTimer(timerId);
    refresh();
    showHUD("⏸ Timer paused");
  }
  function handleResume() {
    resumeTimer(timerId);
    refresh();
    showHUD("▶ Timer resumed");
  }

  async function changeVolume(v: number) {
    setVolumeState(v);
    await setVolume(v);
    updateTimerSound(timerId, sound, v);
  }
  async function changeSoundFn(id: string) {
    setSoundState(id);
    await setSound(id);
    updateTimerSound(timerId, id, volume);
  }
  function toggleNotifications() {
    const next = !notificationsEnabled;
    setNotificationsState(next);
    setNotificationsInState(next);
    showHUD(next ? "🔔 Notifications on" : "🔕 Notifications off");
  }

  if (!timer) return <Detail markdown="Loading..." />;

  const elapsed = timer.totalSeconds - timer.remaining;
  const currentSoundLabel =
    SOUND_OPTIONS.find((s) => s.id === sound)?.label ?? "Classic";
  const noteSection = `\n\n---\n\n${timer.note ? timer.note : "> *You can add a note alongside the timer, or via Actions (Ctrl+K).*"}`;

  let markdown: string;
  if (timer.status === "done") {
    markdown = `<div align="center">\n\n# ✅ Time's up!\n\n**${timer.label}** has finished.\n\n</div>${noteSection}`;
  } else if (timer.status === "paused") {
    markdown = `<div align="center">\n\n&nbsp;\n\n# ⏸ ${formatCountdown(timer.remaining)}\n\n&nbsp;\n\n</div>${noteSection}`;
  } else {
    markdown = `<div align="center">\n\n&nbsp;\n\n# ${formatCountdown(timer.remaining)}\n\n&nbsp;\n\n</div>${noteSection}`;
  }

  const volumeActions = VOLUME_OPTIONS.map((v) => (
    <Action
      key={`vol-${v}`}
      title={`${v}%${v === volume ? " ✓" : ""}`}
      onAction={() => changeVolume(v)}
    />
  ));
  const soundActions = SOUND_OPTIONS.map((s) => (
    <Action
      key={s.id}
      title={`${s.label}${s.id === sound ? " ✓" : ""}`}
      onAction={() => changeSoundFn(s.id)}
    />
  ));

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Timer"
            text={timer.label}
            icon={{ source: Icon.Stopwatch, tintColor: Color.Blue }}
          />
          <Detail.Metadata.Label
            title="Elapsed"
            text={formatCountdown(elapsed)}
            icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Volume"
            text={`${volume}%`}
            icon={Icon.Speaker}
          />
          <Detail.Metadata.Label
            title="Sound"
            text={currentSoundLabel}
            icon={Icon.Music}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Notifications"
            text={notificationsEnabled ? "On" : "Off"}
            icon={{
              source: notificationsEnabled ? Icon.Bell : Icon.BellDisabled,
              tintColor: notificationsEnabled
                ? Color.Green
                : Color.SecondaryText,
            }}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {timer.status === "done" ? (
            <Action
              title="Dismiss"
              icon={Icon.CheckCircle}
              onAction={handleDismiss}
            />
          ) : (
            <>
              <Action title="Back" icon={Icon.ArrowLeft} onAction={pop} />
              <Action
                title="Cancel"
                icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "return" }}
                onAction={handleCancel}
              />
              <Action
                title={timer.status === "paused" ? "Resume" : "Pause"}
                icon={
                  timer.status === "paused"
                    ? { source: Icon.Play, tintColor: Color.Green }
                    : { source: Icon.Pause, tintColor: Color.Yellow }
                }
                shortcut={{ modifiers: [], key: "space" }}
                onAction={
                  timer.status === "paused" ? handleResume : handlePause
                }
              />
            </>
          )}
          <ActionPanel.Section>
            <Action
              title={timer.note ? "Edit Note" : "Add Note"}
              icon={timer.note ? Icon.Pencil : Icon.Plus}
              onAction={() =>
                push(
                  <Form
                    navigationTitle={timer.note ? "Edit Note" : "Add Note"}
                    actions={
                      <ActionPanel>
                        <Action.SubmitForm
                          title="Save"
                          onSubmit={(v: { note: string }) => {
                            const state = readState();
                            const t = state.timers.find(
                              (t) => t.id === timerId,
                            );
                            if (t) {
                              t.note = v.note;
                              writeState(state);
                            }
                            pop();
                            refresh();
                          }}
                        />
                      </ActionPanel>
                    }
                  >
                    <Form.TextField
                      id="note"
                      title="Note"
                      placeholder="What is this timer for?"
                      defaultValue={timer.note}
                    />
                  </Form>,
                )
              }
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <ActionPanel.Submenu
              title={`Volume: ${volume}%`}
              icon={Icon.Speaker}
            >
              {volumeActions}
            </ActionPanel.Submenu>
            <ActionPanel.Submenu
              title={`Sound: ${currentSoundLabel}`}
              icon={Icon.Music}
            >
              {soundActions}
            </ActionPanel.Submenu>
            <Action
              title={
                notificationsEnabled
                  ? "Notifications: on ✓"
                  : "Notifications: Off"
              }
              icon={notificationsEnabled ? Icon.Bell : Icon.BellDisabled}
              onAction={toggleNotifications}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

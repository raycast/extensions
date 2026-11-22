import {
  Action,
  ActionPanel,
  closeMainWindow,
  Detail,
  environment,
  Icon,
  Keyboard,
  popToRoot,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { renderDial, svgToDataUri } from "../lib/dial.ts";
import { encouragement, formatTimeOfDay } from "../lib/format.ts";
import { flowStartedAt, flowStoppedAt, getRemainingMs } from "../lib/state.ts";
import { addToCurrent, pauseCurrent, restartCurrent, resumeCurrent, stopCurrent } from "../lib/timer-service.ts";
import type { SandglassState, Timer } from "../lib/types.ts";
import { plainDurationTitle } from "./helpers.ts";
import { PickerList } from "./PickerList.tsx";

interface TimerViewProps {
  timer: Timer;
  state: SandglassState;
  now: number;
  onChange: (state: SandglassState) => void;
}

/** Ctrl on Windows, Cmd on macOS. */
const shortcut = (key: Keyboard.KeyEquivalent): Keyboard.Shortcut => ({
  macOS: { modifiers: ["cmd"], key },
  Windows: { modifiers: ["ctrl"], key },
});

function captionFor(timer: Timer): string {
  if (timer.status === "paused") return "Paused";
  if (timer.status === "finished") return "Time's up";
  return `Ends at ${formatTimeOfDay(timer.endsAt)}`;
}

/** The picker pushed by "New Timer": starting a timer there replaces the current one and returns. */
function NewTimerPicker({ state, onChange }: Omit<TimerViewProps, "timer" | "now">) {
  const { pop } = useNavigation();
  // A pushed view doesn't receive the parent's updates, so it keeps its own clock.
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <PickerList
      state={state}
      now={now}
      onStarted={(next) => {
        onChange(next);
        pop();
      }}
    />
  );
}

export function TimerView({ timer, state, now, onChange }: TimerViewProps) {
  const remainingMs = getRemainingMs(timer, now);
  const dial = renderDial({
    remainingMs,
    totalMs: timer.durationMs,
    status: timer.status,
    theme: environment.appearance,
    label: timer.label,
    caption: captionFor(timer),
    wide: true,
    nowMs: now,
    flowStartMs: flowStartedAt(timer),
    flowStopMs: flowStoppedAt(timer),
  });
  const markdown = `![Timer](${svgToDataUri(dial)})\n\n${encouragement(timer.status, remainingMs, timer.startedAt)}`;

  const restart = () => onChange(restartCurrent());

  const stop = () => {
    onChange(stopCurrent());
    void showToast({ title: "Timer stopped" });
  };

  const done = async () => {
    onChange(stopCurrent());
    await closeMainWindow({ clearRootSearch: true });
    await popToRoot();
  };

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          {timer.status === "finished" ? (
            <>
              <Action
                title={`Restart ${plainDurationTitle(timer.durationMs)}`}
                icon={Icon.RotateClockwise}
                onAction={restart}
              />
              <Action
                title="5 More Minutes"
                icon={Icon.PlusCircle}
                shortcut={shortcut("=")}
                onAction={() => onChange(addToCurrent(5 * 60_000))}
              />
              <Action
                title="New Timer"
                icon={Icon.Plus}
                shortcut={shortcut("n")}
                onAction={() => onChange(stopCurrent())}
              />
              <Action title="Done" icon={Icon.Checkmark} onAction={done} />
            </>
          ) : (
            <>
              {timer.status === "running" ? (
                <Action title="Pause" icon={Icon.Pause} onAction={() => onChange(pauseCurrent())} />
              ) : (
                <Action title="Resume" icon={Icon.Play} onAction={() => onChange(resumeCurrent())} />
              )}
              <Action
                title="Add 1 Minute"
                icon={Icon.PlusCircle}
                shortcut={shortcut("=")}
                onAction={() => onChange(addToCurrent(60_000))}
              />
              <Action title="Restart" icon={Icon.RotateClockwise} shortcut={shortcut("r")} onAction={restart} />
              <Action
                title="Stop Timer"
                icon={Icon.Stop}
                style={Action.Style.Destructive}
                shortcut={shortcut("backspace")}
                onAction={stop}
              />
              <Action.Push
                title="New Timer"
                icon={Icon.Plus}
                shortcut={shortcut("n")}
                target={<NewTimerPicker state={state} onChange={onChange} />}
              />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}

import {
  Action,
  ActionPanel,
  closeMainWindow,
  Detail,
  environment,
  Icon,
  Keyboard,
  popToRoot,
  PopToRootType,
  showHUD,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useRef } from "react";
import { renderDial, svgToDataUri } from "../lib/dial.ts";
import { encouragement, formatTimeOfDay } from "../lib/format.ts";
import { flowStartedAt, flowStoppedAt, getRemainingMs } from "../lib/state.ts";
import {
  addToCurrent,
  currentTimer,
  pauseCurrent,
  restartCurrent,
  resumeCurrent,
  stopCurrent,
} from "../lib/timer-service.ts";
import type { SandglassState, Timer } from "../lib/types.ts";
import { plainDurationTitle } from "./helpers.ts";
import { PickerList } from "./PickerList.tsx";
import { useLiveState } from "./useLiveState.ts";

interface TimerScreenProps {
  initialState: SandglassState;
  /** True when pushed from the picker: Stop and New Timer then go back to it. */
  pushed?: boolean;
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

/** The picker pushed by "New Timer" from a root timer screen: starting a timer replaces the current one and returns. */
function NewTimerPicker({ state, onStarted }: { state: SandglassState; onStarted: (state: SandglassState) => void }) {
  const { pop } = useNavigation();
  const live = useLiveState(state);
  return (
    <PickerList
      state={live.state}
      now={live.now}
      onStarted={(next) => {
        onStarted(next);
        pop();
      }}
    />
  );
}

/** The live dial for the current timer, either as the command's root or pushed from the picker. */
export function TimerScreen({ initialState, pushed = false }: TimerScreenProps) {
  const { state, setState, now } = useLiveState(initialState);
  const { pop, push } = useNavigation();
  // Keep showing the last timer while the screen closes after Stop.
  const lastTimer = useRef<Timer | undefined>(undefined);
  const current = currentTimer(state);
  if (current) lastTimer.current = current;
  const timer = current ?? lastTimer.current;
  if (!timer) return <Detail markdown="No timer running." />;

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

  /** Runs a timer change and shows the new state, or a failure toast if it couldn't be saved. */
  const change = (title: string, action: () => SandglassState) => {
    try {
      setState(action());
    } catch (error) {
      void showFailureToast(error, { title });
    }
  };

  const stop = async () => {
    try {
      stopCurrent();
    } catch (error) {
      await showFailureToast(error, { title: "Couldn't stop the timer" });
      return;
    }
    if (pushed) {
      pop();
      await showToast({ title: "Timer stopped" });
    } else {
      await showHUD("⏹ Timer stopped", { popToRootType: PopToRootType.Immediate });
    }
  };

  const newTimer = () => {
    if (!pushed) {
      push(<NewTimerPicker state={state} onStarted={setState} />);
      return;
    }
    // Pushed from the picker: go back to it. A finished timer is cleared first; a running one is replaced on start.
    if (timer.status === "finished") {
      try {
        stopCurrent();
      } catch (error) {
        void showFailureToast(error, { title: "Couldn't clear the timer" });
        return;
      }
    }
    pop();
  };

  const done = async () => {
    try {
      stopCurrent();
    } catch (error) {
      await showFailureToast(error, { title: "Couldn't clear the timer" });
      return;
    }
    await closeMainWindow({ clearRootSearch: true });
    await popToRoot();
  };

  const restart = () => change("Couldn't restart the timer", restartCurrent);

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
                onAction={() => change("Couldn't add time", () => addToCurrent(5 * 60_000))}
              />
              <Action title="New Timer" icon={Icon.Plus} shortcut={shortcut("n")} onAction={newTimer} />
              <Action title="Done" icon={Icon.Checkmark} onAction={done} />
            </>
          ) : (
            <>
              {timer.status === "running" ? (
                <Action
                  title="Pause"
                  icon={Icon.Pause}
                  onAction={() => change("Couldn't pause the timer", pauseCurrent)}
                />
              ) : (
                <Action
                  title="Resume"
                  icon={Icon.Play}
                  onAction={() => change("Couldn't resume the timer", resumeCurrent)}
                />
              )}
              <Action
                title="Add 1 Minute"
                icon={Icon.PlusCircle}
                shortcut={shortcut("=")}
                onAction={() => change("Couldn't add time", () => addToCurrent(60_000))}
              />
              <Action title="Restart" icon={Icon.RotateClockwise} shortcut={shortcut("r")} onAction={restart} />
              <Action
                title="Stop Timer"
                icon={Icon.Stop}
                style={Action.Style.Destructive}
                shortcut={shortcut("backspace")}
                onAction={stop}
              />
              <Action title="New Timer" icon={Icon.Plus} shortcut={shortcut("n")} onAction={newTimer} />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}

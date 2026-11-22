import { LaunchProps, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { PickerList } from "./components/PickerList.tsx";
import { TimerScreen } from "./components/TimerScreen.tsx";
import { useLiveState } from "./components/useLiveState.ts";
import { parseDuration } from "./lib/parse.ts";
import { currentTimer, loadState, startTimer } from "./lib/timer-service.ts";
import type { SandglassState } from "./lib/types.ts";

interface Launch {
  state: SandglassState;
  /** The `duration` argument, when it couldn't be read. */
  invalidInput?: string;
}

/** Reads the state once at launch and starts a timer first if a valid `duration` argument was passed. */
function launchState(input: string | undefined): Launch {
  const text = input?.trim();
  if (text) {
    const parsed = parseDuration(text);
    if (parsed) return { state: startTimer(parsed.ms, parsed.label, true) };
    return { state: loadState(), invalidInput: text };
  }
  return { state: loadState() };
}

/** The picker as the command's root: starting a timer pushes the timer screen, so Esc comes back here. */
function PickerRoot({ initialState }: { initialState: SandglassState }) {
  const { state, setState, now } = useLiveState(initialState);
  const { push } = useNavigation();
  return (
    <PickerList
      state={state}
      now={now}
      onStarted={(next) => {
        setState(next);
        push(<TimerScreen initialState={next} pushed />);
      }}
    />
  );
}

export default function Command(props: LaunchProps<{ arguments: Arguments.StartTimer }>) {
  // Decided once per launch: the root view never switches; every later screen is pushed.
  const [launch] = useState(() => launchState(props.arguments.duration));

  useEffect(() => {
    if (!launch.invalidInput) return;
    void showToast({
      style: Toast.Style.Failure,
      title: `Couldn't read “${launch.invalidInput}”`,
      message: "Try 25, 1h 30m, 10:00 or at 15:30",
    });
  }, []);

  if (currentTimer(launch.state)) return <TimerScreen initialState={launch.state} />;
  return <PickerRoot initialState={launch.state} />;
}

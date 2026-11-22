import { LaunchProps, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { PickerList } from "./components/PickerList.tsx";
import { TimerView } from "./components/TimerView.tsx";
import { parseDuration } from "./lib/parse.ts";
import { currentTimer, loadState, startTimer } from "./lib/timer-service.ts";

export default function Command(props: LaunchProps<{ arguments: Arguments.StartTimer }>) {
  const [state, setState] = useState(loadState);
  const [now, setNow] = useState(Date.now);
  const handledArgument = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      const tick = Date.now();
      setNow(tick);
      setState((current) => {
        const timer = currentTimer(current);
        return timer?.status === "running" && timer.endsAt <= tick ? loadState() : current;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (handledArgument.current) return;
    handledArgument.current = true;
    const input = props.arguments.duration?.trim();
    if (!input) return;
    const parsed = parseDuration(input);
    if (parsed) {
      setState(startTimer(parsed.ms, parsed.label, true));
    } else {
      void showToast({
        style: Toast.Style.Failure,
        title: `Couldn't read “${input}”`,
        message: "Try 25, 1h 30m, 10:00 or at 15:30",
      });
    }
  }, [props.arguments.duration]);

  const timer = currentTimer(state);
  if (timer) return <TimerView timer={timer} state={state} now={now} onChange={setState} />;
  return <PickerList state={state} now={now} onStarted={setState} />;
}

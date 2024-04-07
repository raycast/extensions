import { Detail } from "@raycast/api";
import { useEffect, useState } from "react";
import { formatDuration, getDuration, stopTimer, Timer } from "./Timers";

export default function Command() {
  const [timer, setTimer] = useState<Timer | null>(null);

  useEffect(() => {
    stopTimer().then(setTimer);
  }, []);

  if (timer === null) {
    return <Detail markdown={"No timer running"} />;
  }

  return (
    <Detail
      markdown={`# Stopped ${timer.name}: ${formatDuration(getDuration(timer))}\n\n- Started: ${new Date(timer.start).toLocaleString()}\n- Ended: ${new Date(timer.end ?? 0).toLocaleString()}`}
    />
  );
}

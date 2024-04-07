import { Detail, LaunchProps } from "@raycast/api";
import { useEffect, useState } from "react";
import { startTimer, Timer } from "./Timers";

export default function Command(options: LaunchProps) {
  const [timer, setTimer] = useState<Timer | null>(null);

  useEffect(() => {
    startTimer(options.arguments.name ?? "Unnamed timer").then(setTimer);
  }, []);

  if (timer === null) {
    return <Detail markdown={"Starting timer..."} />;
  }

  return <Detail markdown={`# Started timer ${timer.name}`} />;
}

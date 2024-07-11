import { List } from "@raycast/api";
import React from "react";
import { v4 as uuidv4 } from "uuid";
import type { Timer } from "../utils/timerUtils";

interface TimerLogViewProps {
  timer: Timer;
}

export function TimerLogView({ timer }: TimerLogViewProps) {
  return (
    <List>
      {timer.logs.map((log) => (
        <List.Item key={uuidv4()} title={`${log.startTime} - ${log.endTime}`} subtitle={`Duration: ${log.duration}`} />
      ))}
    </List>
  );
}

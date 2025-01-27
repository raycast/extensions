import { Action, ActionPanel, List } from "@raycast/api";
import { listTimers, stopTimer, ListedTimer, startTimer } from "./timerManager";
import { useEffect, useState } from "react";

export default function ListTimers() {
  const [timers, setTimers] = useState<ListedTimer[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimers(listTimers());
    }, 1000);

    setTimers(listTimers());
    return () => clearInterval(interval);
  }, []);

  return (
    <List>
      {timers.map((timer) => (
        <List.Item
          key={timer.fileName}
          title={timer.name}
          subtitle={`${Math.floor(timer.timeLeft / 60)}m ${timer.timeLeft % 60}s`}
          accessories={[{ text: `PID:${timer.pid ?? "stopped?"}` }]}
          actions={
            <ActionPanel>
              <Action title="Stop Timer" onAction={() => stopTimer(timer.fileName)} />
              <Action
                title="Restart Timer"
                onAction={() => {
                  stopTimer(timer.fileName);
                  startTimer(timer.totalSeconds, timer.name);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

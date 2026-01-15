import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { refreshTimers, removeTimer, TimerTask } from "./utils";

export default function Command() {
  const [timers, setTimers] = useState<TimerTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initial load
    setTimers(refreshTimers());
    setIsLoading(false);
  }, []);

  const handleRemove = (id: string) => {
    removeTimer(id);
    setTimers(refreshTimers());
  };

  return (
    <List isLoading={isLoading}>
      {timers.length === 0 ? (
        <List.EmptyView
          icon={Icon.Alarm}
          title="No active timers"
          description="Use 'Set Timer' command to create one"
        />
      ) : (
        timers.map((timer) => {
          const timeLeft = Math.max(0, Math.floor((timer.dueTime - Date.now()) / 1000));
          const hours = Math.floor(timeLeft / 3600);
          const minutes = Math.floor((timeLeft % 3600) / 60);
          const seconds = timeLeft % 60;

          let timeString = "";
          if (hours > 0) timeString += `${hours}h `;
          if (minutes > 0) timeString += `${minutes}m `;
          timeString += `${seconds}s`;

          return (
            <List.Item
              key={timer.id}
              title={timer.content}
              subtitle={`Ends in ${timeString}`}
              accessories={[{ text: new Date(timer.dueTime).toLocaleTimeString() }, { icon: Icon.Clock }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Cancel Timer"
                    icon={Icon.Stop}
                    style={Action.Style.Destructive}
                    onAction={() => handleRemove(timer.id)}
                  />
                  <ActionPanel.Section>
                    <Action
                      title="Refresh List"
                      icon={Icon.RotateClockwise}
                      onAction={() => setTimers(refreshTimers())}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

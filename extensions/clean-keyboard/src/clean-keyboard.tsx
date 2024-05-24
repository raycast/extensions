import { ActionPanel, Icon, List, Toast, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import { handler } from "swift:../swift/MyExecutable";

interface Duration {
  display: string;
  seconds: number;
  icon: string;
}

const durations: Duration[] = [
  {
    display: "15 seconds",
    seconds: 15,
    icon: "🪥",
  },
  {
    display: "30 seconds",
    seconds: 30,
    icon: "🧽",
  },
  {
    display: "1 minute",
    seconds: 60,
    icon: "🧼",
  },
  {
    display: "2 minutes",
    seconds: 120,
    icon: "🚿",
  },
  {
    display: "5 minutes",
    seconds: 300,
    icon: "🛁",
  },
];

export default function Command() {
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [icon, setIcon] = useState<string | null>(null);

  const selectDuration = (duration: Duration) => {
    const lockToast = new Toast({ title: "Keyboard Locked" });
    handler(duration.seconds);
    setTimeLeft(duration.seconds);
    setIcon(duration.icon);
    setIsRunning(true);
    lockToast.show();
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (isRunning && timeLeft) {
        setTimeLeft(timeLeft - 1);
        if (timeLeft - 1 === 0) {
          setIsRunning(false);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  if (isRunning) {
    return (
      <List>
        <List.EmptyView
          icon={icon ?? "🧼"}
          description="Press ⌃ + U at any time to unlock keyboard."
          title={`Cleaning keyboard${timeLeft ? ` for ${timeLeft} seconds ` : ""}`}
          actions={
            <ActionPanel>
              <Action title={"Back"} onAction={() => setIsRunning(false)} />
              <Action
                autoFocus={false}
                title={"Unlock Keyboard"}
                shortcut={{ modifiers: ["ctrl"], key: "u" }}
                onAction={() => setIsRunning(false)}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }
  return (
    <List filtering={false} navigationTitle="Lock keyboard for..">
      <List.Section title="Durations">
        {durations.map((duration) => (
          <List.Item
            key={duration.display + duration.seconds}
            title={`Lock Keyboard for ${duration.display}`}
            icon={duration.icon}
            actions={
              <ActionPanel>
                <Action title="Lock Keyboard" icon={Icon.Lock} onAction={() => selectDuration(duration)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

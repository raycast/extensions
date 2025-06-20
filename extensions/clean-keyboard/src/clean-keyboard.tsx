import { Action, ActionPanel, Icon, List, Toast, environment } from "@raycast/api";
import { useEffect, useState } from "react";
import { handler, getState } from "swift:../swift/MyExecutable";

type State = {
  timeLeft: number;
  duration: number;
} | null;
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
  {
    display: "1 hour",
    seconds: 3600,
    icon: "🧹",
  },
  {
    display: "24 hours",
    seconds: 86400,
    icon: "🫧",
  },
  {
    display: "Forever",
    seconds: -1,
    icon: "🤯",
  },
];

export default function Command() {
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [icon, setIcon] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial state from file
  useEffect(() => {
    loadStateFromFile();
  }, []);

  const loadStateFromFile = async () => {
    try {
      const state: State = await getState(environment.supportPath);
      const { duration, timeLeft } = state || { timeLeft: 0, duration: 0 };
      if (timeLeft > 0 || timeLeft === -1) {
        setTimeLeft(timeLeft);
        setIsRunning(true);

        // Find the corresponding icon
        const durationObj = durations.find((d) => d.seconds === duration);
        setIcon(durationObj?.icon || "🧼");
      } else {
        // State file shows no active lock
        setIsRunning(false);
        setTimeLeft(null);
        setIcon(null);
      }
    } catch (error) {
      console.error("Error loading state from file:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectDuration = (durationObj: Duration) => {
    const lockToast = new Toast({ title: "Keyboard locked" });
    handler(durationObj.seconds, environment.supportPath);
    setTimeLeft(durationObj.seconds);
    setIcon(durationObj.icon);
    setIsRunning(true);
    lockToast.show();
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (isRunning && timeLeft && timeLeft > 0) {
        setTimeLeft(timeLeft - 1);
        if (timeLeft - 1 === 0) {
          setIsRunning(false);
          setTimeLeft(null);
          setIcon(null);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const unlockKeyboard = async () => {
    setIsRunning(false);
    setTimeLeft(null);
    setIcon(null);
  };

  if (isLoading) {
    return (
      <List isLoading={true}>
        <List.EmptyView
          icon="⏳"
          title="Loading keyboard state..."
          description="Checking if keyboard is currently locked"
        />
      </List>
    );
  }

  if (isRunning) {
    const isForever = timeLeft === -1;
    const title = isForever
      ? "Cleaning keyboard forever…"
      : `Cleaning keyboard${timeLeft ? ` for ${timeLeft} seconds…` : ""}`;

    return (
      <List>
        <List.EmptyView
          icon={icon ?? "🧼"}
          description="Press ⌃ + U at any time to unlock the keyboard."
          title={title}
          actions={
            <ActionPanel>
              <Action title={"Back"} onAction={() => setIsRunning(false)} />
              <Action
                autoFocus={false}
                title={"Unlock Keyboard"}
                shortcut={{ modifiers: ["ctrl"], key: "u" }}
                onAction={unlockKeyboard}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }
  return (
    <List navigationTitle="Clean Keyboard" searchBarPlaceholder="Lock keyboard for">
      <List.Section title="Durations">
        {durations.map((durationObj) => (
          <List.Item
            key={durationObj.display + durationObj.seconds}
            title={`${durationObj.display}`}
            icon={durationObj.icon}
            actions={
              <ActionPanel>
                <Action title="Lock Keyboard" icon={Icon.Lock} onAction={() => selectDuration(durationObj)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

import { Action, ActionPanel, Icon, List, Toast, environment } from "@raycast/api";
import { useEffect, useState } from "react";
import { handler, stopHandler, getState } from "swift:../swift/MyExecutable";

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
    seconds: Infinity,
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
      const stateContent = await getState(environment.supportPath);
      const lines = stateContent.trim().split("\n");
      if (lines.length >= 2) {
        const fileDuration = parseInt(lines[0], 10);
        const fileTimeLeft = parseInt(lines[1], 10);

        if (fileTimeLeft > 0) {
          setTimeLeft(fileTimeLeft);
          setIsRunning(true);

          // Find the corresponding icon
          const durationObj = durations.find((d) => d.seconds === fileDuration);
          setIcon(durationObj?.icon || "🧼");
        } else {
          // State file shows no active lock
          setIsRunning(false);
          setTimeLeft(null);
          setIcon(null);
        }
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
    await stopHandler(environment.supportPath);
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
    return (
      <List>
        <List.EmptyView
          icon={icon ?? "🧼"}
          description="Press ⌃ + U at any time to unlock the keyboard."
          title={`Cleaning keyboard${timeLeft ? ` for ${timeLeft} seconds…` : ""}`}
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

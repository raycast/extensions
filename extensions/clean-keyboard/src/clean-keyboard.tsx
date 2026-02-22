import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { isMac } from "./lib/utils";

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

  const lockAction = async (duration: Duration) => {
    let handler: (duration: number) => void;
    if (isMac) {
      const { handler: handlerSwift } = await import("swift:../swift/MyExecutable");
      handler = handlerSwift;
    } else {
      const { handler: handlerRust } = await import("rust:../rust/clean-keyboard");
      handler = handlerRust;
    }

    setTimeLeft(duration.seconds);
    setIcon(duration.icon);
    setIsRunning(true);
    await showToast({ title: "Keyboard locked" });

    Promise.resolve(handler(duration.seconds)).catch(async (err) => {
      // Roll back UI if hook installation failed
      setIsRunning(false);
      setTimeLeft(null);
      setIcon(null);
      await showToast({ title: "Failed to lock keyboard", message: String(err), style: Toast.Style.Failure });
    });
  };

  const unlockAction = async () => {
    let stopHandler: () => Promise<void>;
    if (isMac) {
      const { stopHandler: stopHandlerSwift } = await import("swift:../swift/MyExecutable");
      stopHandler = stopHandlerSwift;
    } else {
      const { stop_handler: stopHandlerRust } = await import("rust:../rust/clean-keyboard");
      stopHandler = stopHandlerRust;
    }
    try {
      await stopHandler();
    } catch (err) {
      await showToast({ title: "Failed to unlock keyboard", message: String(err), style: Toast.Style.Failure });
      return;
    }
    setIsRunning(false);
    await showToast({ title: "Keyboard unlocked" });
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
          description={`Press ${isMac ? "⌃" : "Ctrl"} + U at any time to unlock the keyboard.`}
          title={`Cleaning keyboard${timeLeft ? ` for ${timeLeft} seconds…` : ""}`}
          actions={
            <ActionPanel>
              <Action title={"Back"} onAction={() => setIsRunning(false)} />
              <Action
                autoFocus={false}
                title={"Unlock Keyboard"}
                shortcut={{ modifiers: ["ctrl"], key: "u" }}
                onAction={unlockAction}
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
        {durations.map((duration) => (
          <List.Item
            key={duration.display + duration.seconds}
            title={`${duration.display}`}
            icon={duration.icon}
            actions={
              <ActionPanel>
                <Action title="Lock Keyboard" icon={Icon.Lock} onAction={() => lockAction(duration)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

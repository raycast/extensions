import {
  Action,
  ActionPanel,
  List,
  showToast,
  Toast,
  environment,
  useNavigation,
} from "@raycast/api";
import React from "react";
import { useEffect, useState, useRef } from "react";
import { spawn, ChildProcess, exec } from "child_process";
import path from "path";
import fs from "fs";

const DURATIONS = [
  { label: "15 seconds", value: 15, icon: "⏱️" },
  { label: "30 seconds", value: 30, icon: "🧽" },
  { label: "1 minute", value: 60, icon: "🧼" },
  { label: "2 minutes", value: 120, icon: "🚿" },
  { label: "5 minutes", value: 300, icon: "🛁" },
  { label: "1 hour", value: 3600, icon: "🧹" },
  { label: "24 hours", value: 86400, icon: "🫧" },
];

export default function Command() {
  return (
    <List searchBarPlaceholder="Lock keyboard for...">
      <List.Section title="Durations">
        {DURATIONS.map((item) => (
          <List.Item
            key={item.value}
            title={item.label}
            icon={item.icon}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Lock Keyboard"
                  target={
                    <CleaningView duration={item.value} icon={item.icon} />
                  }
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function CleaningView({ duration, icon }: { duration: number; icon: string }) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isLocked, setIsLocked] = useState(true);
  const childProcessRef = useRef<ChildProcess | null>(null);
  const { pop } = useNavigation();

  useEffect(() => {
    const startBlocker = async () => {
      // Add a small delay to ensure UI is rendered
      await new Promise((resolve) => setTimeout(resolve, 500));

      const blockerPath = path.join(
        environment.assetsPath,
        "KeyboardBlocker.exe",
      );
      console.log("Blocker path:", blockerPath);

      if (!fs.existsSync(blockerPath)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Blocker not found",
          message: `Path: ${blockerPath}`,
        });
        setIsLocked(false);
        return;
      }

      try {
        const child = spawn(blockerPath, [], {
          detached: false,
          stdio: "ignore",
        });

        childProcessRef.current = child;
        console.log(`Blocker started with PID: ${child.pid}`);

        child.on("close", (code) => {
          console.log("Blocker closed with code:", code);
          setIsLocked(false);
        });

        child.on("error", (err) => {
          console.error("Failed to start blocker:", err);
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to start blocker",
            message: err.message,
          });
          setIsLocked(false);
        });
      } catch (error) {
        console.error(error);
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: error instanceof Error ? error.message : String(error),
        });
        setIsLocked(false);
      }
    };

    startBlocker();

    return () => {
      killBlocker();
    };
  }, []);

  const killBlocker = () => {
    console.log("Attempting to kill blocker...");

    // 1. Try killing by PID if we have it
    if (childProcessRef.current) {
      const pid = childProcessRef.current.pid;
      console.log(`Killing PID: ${pid}`);
      exec(`taskkill /PID ${pid} /F /T`, (err) => {
        if (err) {
          console.warn("Failed to kill by PID, trying by name...", err);
          // 2. Fallback: Kill by image name
          exec("taskkill /IM KeyboardBlocker.exe /F");
        }
      });
    } else {
      // 3. Fallback if no ref: Kill by image name
      console.log("No PID ref, killing by name...");
      exec("taskkill /IM KeyboardBlocker.exe /F");
    }
  };

  useEffect(() => {
    if (timeLeft <= 0 && isLocked) {
      killBlocker();
      setIsLocked(false);
    }
  }, [timeLeft, isLocked]);

  useEffect(() => {
    if (!isLocked) {
      // Add a small delay before popping so the user sees "Unlocked"
      const timeout = setTimeout(() => {
        pop();
      }, 1000);
      return () => clearTimeout(timeout);
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [isLocked, pop]);

  // Format time left
  const formatTime = (seconds: number) => {
    if (seconds >= 3600) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      return `${h}h ${m}m`;
    }
    if (seconds >= 60) {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}m ${s}s`;
    }
    return `${seconds} seconds`;
  };

  return (
    <List>
      <List.EmptyView
        icon={{ source: icon }}
        title={`Cleaning keyboard for ${formatTime(timeLeft)}...`}
        description="Press Ctrl + U at any time to unlock the keyboard."
        actions={
          <ActionPanel>
            <Action
              title="Unlock Now"
              shortcut={{ modifiers: ["ctrl"], key: "u" }}
              onAction={() => {
                killBlocker();
                setIsLocked(false);
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

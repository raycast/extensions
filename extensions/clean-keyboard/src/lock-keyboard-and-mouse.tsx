import { Action, ActionPanel, environment, Icon, List, showHUD } from "@raycast/api";
import { spawn } from "node:child_process";
import { chmod } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { useRef } from "react";
import { isMac } from "./lib/utils";

type LockEvent = {
  phase: "preparing" | "locked" | "unlocking" | "ready" | "error";
  message: string;
  reason?: string;
};

const durations = [
  { value: "30", title: "30 seconds", icon: "🧽" },
  { value: "600", title: "10 minutes", icon: "☕️" },
  { value: "1800", title: "30 minutes", icon: "🍽️" },
  { value: "3600", title: "1 hour", icon: "🏃" },
  { value: "7200", title: "2 hours", icon: "🎬" },
  { value: "18000", title: "5 hours", icon: "😴" },
  { value: "indefinite", title: "Forever", icon: "🤯" },
];

const unlockMessages: Record<string, string> = {
  timeout: "Keyboard and mouse unlocked automatically: duration ended",
  watchdog: "Keyboard and mouse unlocked automatically: helper recovery",
  touchID: "Keyboard and mouse unlocked with Touch ID",
};

async function lockInputs(selectedDuration: string) {
  if (!isMac) {
    await showHUD("Lock Keyboard and Mouse is only available on macOS.");
    return;
  }
  await showHUD("Locking keyboard and mouse…");
  // Spawn the compiled Swift package directly, the same way the swift: import does,
  // because the bridge only returns output when the process exits and this command
  // needs each status line while the lock runs.
  const helperPath = join(environment.assetsPath, "compiled_raycast_swift", "MyExecutable");
  await chmod(helperPath, 0o755);
  const helper = spawn(helperPath, ["lockInputs", JSON.stringify(selectedDuration)], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  let lastPhase: LockEvent["phase"] | undefined;
  let recovered = false;
  let feedback = Promise.resolve();
  const notify = (message: string) => {
    feedback = feedback
      .then(() => showHUD(message))
      .catch((error) => console.error("Could not show Lock Keyboard and Mouse status", error));
  };
  const handleRecord = (line: string) => {
    try {
      const event = JSON.parse(line) as LockEvent;
      lastPhase = event.phase;
      recovered = event.phase === "ready" && (event.reason === "timeout" || event.reason === "watchdog");
      if (event.phase === "locked") notify("Typing and clicks blocked. Tap Command 3 times for Touch ID.");
      if (event.phase === "unlocking") notify("Waiting for Touch ID…");
      if (event.phase === "error") notify(`Lock Keyboard and Mouse failed: ${event.message}`);
      if (event.phase === "ready" && event.reason)
        notify(unlockMessages[event.reason] ?? "Keyboard and mouse unlocked");
    } catch {
      console.error("Invalid helper output", line);
    }
  };
  createInterface({ input: helper.stdout }).on("line", handleRecord);
  helper.stderr.setEncoding("utf8");
  helper.stderr.on("data", (chunk: string) => (stderr += chunk));

  await new Promise<void>((resolve) => {
    helper.on("error", async (error) => {
      helper.removeAllListeners("close");
      notify(`Lock Keyboard and Mouse failed: ${error.message}`);
      await feedback;
      resolve();
    });
    helper.on("close", async (code, signal) => {
      if (code !== 0 && lastPhase !== "error" && !recovered) {
        const exitReason = signal ? `helper terminated by ${signal}` : `helper exited ${code}`;
        notify(`Lock Keyboard and Mouse failed: ${stderr.trim() || exitReason}`);
      }
      await feedback;
      resolve();
    });
  });
}

export default function Command() {
  const launching = useRef(false);
  const startLock = async (duration: string) => {
    if (launching.current) return;
    launching.current = true;
    try {
      await lockInputs(duration);
    } catch (error) {
      await showHUD(`Lock Keyboard and Mouse failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      launching.current = false;
    }
  };
  return (
    <List navigationTitle="Lock Keyboard and Mouse" searchBarPlaceholder="Lock keyboard and mouse for">
      <List.Section title="Durations" subtitle="Unlock: tap Command 3 times, then Touch ID">
        {durations.map(({ value, title, icon }) => (
          <List.Item
            key={value}
            title={title}
            icon={icon}
            actions={
              <ActionPanel>
                <Action title="Lock Keyboard and Mouse" icon={Icon.Lock} onAction={() => startLock(value)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

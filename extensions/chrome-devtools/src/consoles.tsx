import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import { useEffect, useState } from "react";
import { DebugTarget } from "../types";
import DevtoolsPanel from "./components/devtools-panel";
import { exec } from "child_process";

export default function Command() {
  const [targets, setTargets] = useState<DebugTarget[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Auto-launch Chrome on extension open
  useEffect(() => {
    const launchChrome = async () => {
      try {
        // First check if debugger is already available
        await fetch("http://localhost:9222/json");
      } catch (error) {
        // If not, launch Chrome with debugging flags
        showToast(Toast.Style.Animated, "Launching Chrome Debugger...");
        return new Promise<void>((resolve) => {
          exec(
            `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \\
              --remote-debugging-port=9222 \\
              --remote-allow-origins=http://localhost:9222 \\`,
            (error) => {
              if (error) {
                showToast(Toast.Style.Failure, "Failed to launch Chrome. Close existing instances first.");
              }
              resolve();
            },
          );
        });
      }
    };

    launchChrome().then(() => {
      // Load targets after Chrome is ready
      setIsLoading(true);
      fetch("http://localhost:9222/json")
        .then((res) => res.json())
        .then((data) => setTargets(data as DebugTarget[]))
        .catch(() => showToast(Toast.Style.Failure, "Debugger unavailable"))
        .finally(() => setIsLoading(false));
    });
  }, []);

  return (
    <List isLoading={isLoading}>
      <List.Section title="Debug Targets">
        {targets.map((target) => (
          <List.Item
            key={target.id}
            title={target.title}
            subtitle={target.url}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Start Monitoring"
                  target={<DevtoolsPanel selectedTarget={target.id} targets={targets} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

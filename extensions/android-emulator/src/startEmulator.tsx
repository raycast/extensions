import { Action, ActionPanel, List, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { adbPath, emulatorPath, executeAsync } from "./util";
import { Emulator } from "./types";
import { spawn } from "child_process";
import { getEmulators, startEmulator } from "./emulatorUtil";

export default function Command() {
  const [isLoading, setLoading] = useState<boolean>(true);
  const [devices, setDevices] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      await fetchEmulators();
    })();
  }, []);

  async function fetchEmulators() {
    try {
      setLoading(true);
      const runningEmulators = await getEmulators();
      const avdsResponse = await executeAsync(`${emulatorPath} -list-avds`);
      if (avdsResponse.length > 0) {
        const devices = avdsResponse
          .split("\n")
          .map((item) => item.trim())
          .filter(
            (item) =>
              item.length > 0 &&
              runningEmulators.filter((runningEmulator) => runningEmulator.name === item).length === 0
          );
        setDevices(devices);
      }

      setLoading(false);
    } catch (error: any) {
      setLoading(false);
      await showToast({ title: `Error:${error}` });
    }
  }

  async function start(name: string) {
    startEmulator(name);
    await fetchEmulators();
  }

  return (
    <List isLoading={isLoading}>
      {devices.map((item) => {
        return (
          <List.Item
            title={item}
            key={item}
            actions={
              <ActionPanel>
                <Action title="Start" onAction={() => start(item)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

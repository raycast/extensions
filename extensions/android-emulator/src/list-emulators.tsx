import { Action, ActionPanel, List, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { adbPath, executeAsync, setTmeoutAsync } from "./util";
import { Emulator } from "./types";
import { getEmulators, startEmulator } from "./emulatorUtil";

export default function Command() {
  const [isLoading, setLoading] = useState<boolean>(true);
  const [devices, setDevices] = useState<Emulator[]>([]);

  useEffect(() => {
    (async () => {
      await fetchEmulators();
    })();
  }, []);

  async function fetchEmulators() {
    try {
      const devices = await getEmulators();
      setDevices(devices);
      setLoading(false);
    } catch (error: any) {
      setLoading(false);
      await showToast({ title: `Error:${error}` });
    }
  }

  async function shutdownEmulator(emulator: Emulator) {
    const toast = await showToast({ title: "Shutting Down..", style: Toast.Style.Animated });
    const response = await executeAsync(`${adbPath} -s ${emulator.id} emu kill`);
    await waitForShutdown(emulator);
    await toast.hide();
    await showToast({ title: response.trim(), style: Toast.Style.Success });
    await fetchEmulators();
  }

  async function restartEmulator(emulator: Emulator) {
    await shutdownEmulator(emulator);
    const toast = await showToast({ title: "Starting..", style: Toast.Style.Animated });
    toast.hide();
    startEmulator(emulator.name);
    await showToast({ title: "Executed" });
    await fetchEmulators();
  }

  async function waitForShutdown(emulator: Emulator) {
    const devices = await getEmulators();
    const isShutdown = devices.filter((item) => item.name === emulator.name).length === 0;
    if (!isShutdown) {
      await setTmeoutAsync(1000);
      await waitForShutdown(emulator);
    }
  }
  return (
    <List isLoading={isLoading}>
      {devices.map((item) => {
        return (
          <List.Item
            title={item.name}
            subtitle={item.id}
            key={item.id}
            actions={
              <ActionPanel>
                <Action title="Shutdown" style={Action.Style.Destructive} onAction={() => shutdownEmulator(item)} />
                <Action title="Restart" onAction={() => restartEmulator(item)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

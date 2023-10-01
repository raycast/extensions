import { Action, ActionPanel, List, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { adbPath, executeAsync } from "./util";
import { Emulator } from "./types";
import { getEmulators } from "./emulatorUtil";

export default function Command() {
  const [isLoading, setLoading] = useState<boolean>(true);
  const [devices, setDevices] = useState<Emulator[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const devices = await getEmulators();
        setDevices(devices);
        setLoading(false);
      } catch (error: any) {
        setLoading(false);
        await showToast({ title: `Error:${error}` });
      }
    })();
  }, []);

  async function rotate(emulator: Emulator) {
    const response = await executeAsync(`${adbPath} -s ${emulator.id} emu rotate`);
    await showToast({ title: response.trim() });
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
                <Action title="Rotate" onAction={() => rotate(item)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

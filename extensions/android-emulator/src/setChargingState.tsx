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

  async function setAcChargingOn(emulator: Emulator) {
    const response = await executeAsync(`${adbPath} -s ${emulator.id} emu power ac on`);
    await showToast({ title: response.trim() });
  }

  async function setAcChargingOff(emulator: Emulator) {
    const response = await executeAsync(`${adbPath} -s ${emulator.id} emu power ac off`);
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
                <Action title="Set Charging ON" onAction={() => setAcChargingOn(item)} />
                <Action title="Set Charging OFF" onAction={() => setAcChargingOff(item)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

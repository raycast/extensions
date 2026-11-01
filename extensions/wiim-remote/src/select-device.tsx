import { Action, ActionPanel, Detail, Icon, List, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { WiiMAPI } from "./wiim/api";
import { broadcastDiscoverAll } from "./wiim/discovery";
import { getSelectedDeviceIP, setSelectedDeviceIP } from "./wiim/preferences";
import { WiiMDevice } from "./wiim/types";

type WiiMDeviceWithName = WiiMDevice & { name?: string };

async function mapDevicesWithNames(found: WiiMDevice[]): Promise<WiiMDeviceWithName[]> {
  const nameResults = await Promise.allSettled(
    found.map(async (device) => {
      const api = new WiiMAPI(device);
      const info = await api.getSystemInfo();
      return { ip: device.ip, name: info.deviceName };
    }),
  );

  const namesByIp = new Map(
    nameResults
      .filter((result): result is PromiseFulfilledResult<{ ip: string; name: string }> => result.status === "fulfilled")
      .map((result) => [result.value.ip, result.value.name]),
  );

  return found.map((device) => ({
    ...device,
    name: namesByIp.get(device.ip),
  }));
}

async function handleSelect(device: WiiMDevice) {
  try {
    await setSelectedDeviceIP(device.ip);
    await showToast(Toast.Style.Success, "Device Selected", `WiiM device at ${device.ip} selected`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await showFailureToast("Selection Failed", { message });
  }
}

export default function SelectDevice() {
  const [devices, setDevices] = useState<WiiMDeviceWithName[]>([]);
  const [selectedIP, setSelectedIP] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function discover() {
      try {
        setIsLoading(true);
        setSelectedIP(await getSelectedDeviceIP());
        const found = await broadcastDiscoverAll();
        const devicesWithNames = await mapDevicesWithNames(found);
        setDevices(devicesWithNames);

        if (found.length === 0) {
          setError("No WiiM devices found on network");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    void discover();
  }, []);

  if (error && !isLoading) {
    return <Detail markdown={`# Error\n## Device Discovery Failed\n\n${error}`} />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter devices...">
      {devices.length === 0 && !isLoading ? (
        <List.EmptyView title="No Devices Found" description="Searching your network for WiiM devices..." />
      ) : (
        devices.map((device) => (
          <List.Item
            key={device.ip}
            title={device.name || `WiiM Device`}
            subtitle={device.ip}
            accessories={
              device.ip === selectedIP
                ? [{ icon: Icon.CheckCircle, text: "Selected", tooltip: "Currently selected device" }]
                : undefined
            }
            actions={
              <ActionPanel>
                <Action
                  title="Select Device"
                  onAction={async () => {
                    await handleSelect(device);
                    setSelectedIP(device.ip);
                  }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

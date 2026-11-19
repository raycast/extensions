import { Action, ActionPanel, Detail, Icon, List, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { WiiMAPI } from "./wiim/api";
import { broadcastDiscoverAll } from "./wiim/discovery";
import { getManualDeviceIP, getSelectedDeviceIP, setSelectedDeviceIP } from "./wiim/preferences";
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

async function handleSelect(device: WiiMDevice, manualIP?: string): Promise<boolean> {
  try {
    await setSelectedDeviceIP(device.ip);
    await showToast({
      style: Toast.Style.Success,
      title: "Device Selected",
      message: manualIP
        ? `Saved, but the "WiiM Device IP" preference (${manualIP}) takes precedence`
        : `WiiM device at ${device.ip} selected`,
    });
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await showFailureToast("Selection Failed", { message });
    return false;
  }
}

function getAccessories(device: WiiMDevice, manualIP: string | undefined, selectedIP: string | undefined) {
  const accessories: List.Item.Accessory[] = [];

  if (manualIP && device.ip === manualIP) {
    accessories.push({
      icon: Icon.Pin,
      text: "In Use",
      tooltip: 'Set by the "WiiM Device IP" preference, which takes precedence over the selection',
    });
  }

  if (device.ip === selectedIP && device.ip !== manualIP) {
    accessories.push({
      icon: Icon.CheckCircle,
      text: "Selected",
      tooltip: manualIP ? 'Overridden by the "WiiM Device IP" preference' : "Currently selected device",
    });
  }

  return accessories.length > 0 ? accessories : undefined;
}

export default function SelectDevice() {
  const [devices, setDevices] = useState<WiiMDeviceWithName[]>([]);
  const [selectedIP, setSelectedIP] = useState<string | undefined>();
  const [manualIP, setManualIP] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function discover() {
      try {
        setIsLoading(true);
        setManualIP(getManualDeviceIP());
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
            accessories={getAccessories(device, manualIP, selectedIP)}
            actions={
              <ActionPanel>
                <Action
                  title="Select Device"
                  onAction={async () => {
                    if (await handleSelect(device, manualIP)) {
                      setSelectedIP(device.ip);
                    }
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

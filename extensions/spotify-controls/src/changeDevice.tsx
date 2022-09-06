import { ActionPanel, Detail, List, Action, showToast, Toast, Icon, Color } from "@raycast/api";

import { useEffect, useState } from "react";
import { DevicesItem, spotifyOauth } from "./oauth/spotify";

export default function ChangeDevice() {
  const [devices, setDevices] = useState<DevicesItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const auth = async () => {
      try {
        await spotifyOauth.authorize();
        const devices = await spotifyOauth.fetchDevices();
        setDevices(devices);
        setIsLoading(false);
      } catch (err) {
        showToast({ style: Toast.Style.Failure, title: String(err) });
        setIsLoading(false);
      }
    };
    auth();
  }, []);

  if (isLoading) {
    return <Detail isLoading={isLoading} />;
  }

  return (
    <List>
      {devices.map((device, index) => {
        return (
          <List.Item
            key={device.id}
            icon={{
              source:
                device.type.toLowerCase() === "smartphone"
                  ? Icon.Mobile
                  : device.type.toLowerCase() === "computer"
                  ? Icon.Monitor
                  : device.type.toLowerCase() === "tablet"
                  ? Icon.Window
                  : Icon.SpeakerOn,
              tintColor: device.is_active ? Color.Green : undefined
            }}
            title={device.name}
            actions={
              <ActionPanel>
                <Action
                  title="Play on device"
                  onAction={async () => {
                    const toast = await showToast({
                      style: Toast.Style.Animated,
                      title: "Moving devices ..."
                    });
                    try {
                      await spotifyOauth.transferPlayback(device.id);
                      toast.style = Toast.Style.Success;
                      toast.title = "Playing on device";

                      const optimisticNewDevices = devices.map((d) => ({ ...d, is_active: false }));

                      optimisticNewDevices[index].is_active = true;
                      setDevices(optimisticNewDevices);
                    } catch (err) {
                      toast.style = Toast.Style.Failure;
                      toast.title = "Failed to move device";
                      toast.message = (err as Error).message;
                    }
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

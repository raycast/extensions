import { List, Action, ActionPanel, Icon, Color } from "@raycast/api";

import { useState, useEffect, useRef } from "react";
import { showToast, Toast } from "@raycast/api";
import { type DeviceGroup, type HomeyDevice, Homey, HomeyAuthenticationError } from "./lib/Homey";

export default function Command() {
  const [devices, setDevices] = useState<DeviceGroup[]>([]);
  const [homey] = useState<Homey>(new Homey());
  const [index, setIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const authorizingRef = useRef<boolean>(false);
  useEffect(() => {
    const fetchData = async () => {
      if (authorizingRef.current) {
        return;
      }
      try {
        authorizingRef.current = true;
        await homey.auth();
        await homey.selectFirstHomey();
        const devices = await homey.getDevicesInGroups();
        setLoading(false);
        setDevices(devices);
      } catch (error) {
        console.error(error);
        setLoading(false);
        if (!(error instanceof HomeyAuthenticationError)) {
          await showToast({
            title: "Failed to load devices",
            style: Toast.Style.Failure,
          });
        }
      } finally {
        authorizingRef.current = false;
      }
    };

    const timer = setInterval(() => {
      if (homey.getHomey()) {
        fetchData();
      }
    }, 30000);

    fetchData();

    return () => {
      clearInterval(timer);
    };
  }, [homey, index]);

  return (
    <List isLoading={loading}>
      {devices
        .sort((a: DeviceGroup, b: DeviceGroup) => a.name.localeCompare(b.name))
        .map((deviceGroup) => (
          <List.Section key={deviceGroup.name} title={deviceGroup.name}>
            {deviceGroup.devices &&
              deviceGroup.devices
                .sort((a: HomeyDevice, b: HomeyDevice) => a.name.localeCompare(b.name))
                .map((device: HomeyDevice) => (
                  <List.Item
                    key={device.id}
                    icon={{
                      source: device?.capabilitiesObj?.onoff
                        ? device?.capabilitiesObj?.onoff?.value
                          ? "toggle-on.svg"
                          : "toggle-off.svg"
                        : Icon.Link,
                      tintColor: !device?.capabilitiesObj?.onoff
                        ? Color.PrimaryText
                        : device?.capabilitiesObj?.onoff?.value
                          ? Color.Green
                          : Color.Red,
                    }}
                    accessories={
                      !device?.available
                        ? [
                            {
                              icon: { source: Icon.Warning, tintColor: Color.Orange },
                              tooltip: device?.unavailableMessage ? device?.unavailableMessage : "Unavailable",
                            },
                          ]
                        : []
                    }
                    actions={
                      <ActionPanel title={device.name}>
                        <ActionPanel.Section>
                          {device?.capabilitiesObj?.onoff && (
                            <>
                              <Action
                                icon={device?.capabilitiesObj?.onoff?.value ? "toggle-off.svg" : "toggle-on.svg"}
                                title="Toggle"
                                onAction={async () => {
                                  try {
                                    await homey.toggleDevice(device.id);
                                    await showToast({
                                      title: "Device toggled",
                                      message: device.name,
                                      style: Toast.Style.Success,
                                    });
                                    setIndex(index + 1);
                                  } catch (error) {
                                    console.error(error);
                                    if (!(error instanceof HomeyAuthenticationError)) {
                                      await showToast({
                                        title: "Failed to toggle device",
                                        message: device.name,
                                        style: Toast.Style.Failure,
                                      });
                                    }
                                  }
                                }}
                              ></Action>
                            </>
                          )}
                          <Action.OpenInBrowser
                            title="Goto Device"
                            url={"https://my.homey.app/homeys/" + homey.getHomey()?.id + "/devices/" + device.id}
                          ></Action.OpenInBrowser>
                          {device?.capabilitiesObj?.onoff && (
                            <>
                              <Action
                                icon={"toggle-on.svg"}
                                title="On"
                                onAction={async () => {
                                  try {
                                    await homey.turnOnDevice(device.id);
                                    await showToast({
                                      title: "Device turned on",
                                      message: device.name,
                                      style: Toast.Style.Success,
                                    });
                                    setIndex(index + 1);
                                  } catch (error) {
                                    console.error(error);
                                    if (!(error instanceof HomeyAuthenticationError)) {
                                      await showToast({
                                        title: "Failed to turn on device",
                                        message: device.name,
                                        style: Toast.Style.Failure,
                                      });
                                    }
                                  }
                                }}
                              ></Action>
                              <Action
                                title="Off"
                                icon={"toggle-off.svg"}
                                onAction={async () => {
                                  try {
                                    await homey.turnOffDevice(device.id);
                                    await showToast({
                                      title: "Device turned off",
                                      message: device.name,
                                      style: Toast.Style.Success,
                                    });
                                    setIndex(index + 1);
                                  } catch (error) {
                                    console.error(error);
                                    if (!(error instanceof HomeyAuthenticationError)) {
                                      await showToast({
                                        title: "Failed to turn off device",
                                        message: device.name,
                                        style: Toast.Style.Failure,
                                      });
                                    }
                                  }
                                }}
                              ></Action>
                            </>
                          )}
                        </ActionPanel.Section>
                      </ActionPanel>
                    }
                    title={device.name}
                  />
                ))}
          </List.Section>
        ))}
    </List>
  );
}

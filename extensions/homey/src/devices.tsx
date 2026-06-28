import { List, Action, ActionPanel, Icon, Color } from "@raycast/api";

import { useState, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";
import { Homey } from "./lib/Homey";

export default function Command() {
  const [devices, setDevices] = useState<any[]>([]);
  const [homey, setHomey] = useState<Homey>(new Homey());
  const [index, setIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  useEffect(() => {
    const fetchData = async () => {
      await homey.auth();
      await homey.selectFirstHomey();
      const devices = await homey.getDevicesInGroups();
      setLoading(false);
      setDevices(devices);
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
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((deviceGroup) => (
          <List.Section key={deviceGroup.name} title={deviceGroup.name}>
            {deviceGroup.devices &&
              deviceGroup.devices
                .sort((a: any, b: any) => a.name.localeCompare(b.name))
                .map((device: any) => (
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
                                  await homey.toggleDevice(device.id);
                                  await showToast({
                                    title: "Device toggled",
                                    message: device.name,
                                    style: Toast.Style.Success,
                                  });
                                  setIndex(index + 1);
                                }}
                              ></Action>
                            </>
                          )}
                          <Action.OpenInBrowser
                            title="Goto Device"
                            url={"https://my.homey.app/homeys/" + homey.getHomey().id + "/devices/" + device.id}
                          ></Action.OpenInBrowser>
                          {device?.capabilitiesObj?.onoff && (
                            <>
                              <Action
                                icon={"toggle-on.svg"}
                                title="On"
                                onAction={async () => {
                                  await homey.turnOnDevice(device.id);
                                  await showToast({
                                    title: "Device turned on",
                                    message: device.name,
                                    style: Toast.Style.Success,
                                  });
                                  setIndex(index + 1);
                                }}
                              ></Action>
                              <Action
                                title="Off"
                                icon={"toggle-off.svg"}
                                onAction={async () => {
                                  await homey.turnOffDevice(device.id);
                                  await showToast({
                                    title: "Device turned off",
                                    message: device.name,
                                    style: Toast.Style.Success,
                                  });
                                  setIndex(index + 1);
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

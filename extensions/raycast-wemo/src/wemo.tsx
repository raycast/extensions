import { Action, ActionPanel, Icon, List } from "@raycast/api";
import React, { useEffect } from "react";
import Wemo from "wemo-client";
import { DeviceInfo } from "./types";
import { loadDevices, setBrightness, toggleDeviceState } from "./utils";

const WemoComponent = () => {
  const [devices, setDevices] = React.useState<DeviceInfo[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  useEffect(() => {
    loadDevices(setDevices, setIsLoading);
  }, []);

  const wemo = new Wemo();

  return (
    <List isLoading={isLoading}>
      <List.Item
        title={"Reload Devices"}
        actions={
          <ActionPanel>
            <Action title="Reload Devices" onAction={async () => await loadDevices(setDevices, setIsLoading)} />
          </ActionPanel>
        }
      />
      <List.Section title="Devices">
        {devices.length !== 0 &&
          devices.map((item) => (
            <List.Item
              accessories={[
                {
                  text: item.brightness ? item.brightness + "%" : undefined,
                },
                { icon: item.binaryState === "1" ? Icon.LightBulb : Icon.LightBulbOff },
              ]}
              key={item.friendlyName}
              title={item.friendlyName}
              actions={
                <ActionPanel>
                  <Action
                    title="Toggle Device"
                    onAction={async () => {
                      await toggleDeviceState(wemo, item);
                    }}
                  />
                  {item.deviceType === Wemo.DEVICE_TYPE.Dimmer && (
                    <>
                      <Action
                        shortcut={{ modifiers: ["cmd"], key: "=" }}
                        title="Increase Brightness"
                        onAction={async () => await setBrightness(1, wemo, item, setDevices)}
                      ></Action>
                      <Action
                        shortcut={{ modifiers: ["cmd"], key: "-" }}
                        title="Decrease Brightness"
                        onAction={async () => await setBrightness(-1, wemo, item, setDevices)}
                      ></Action>
                    </>
                  )}
                </ActionPanel>
              }
            ></List.Item>
          ))}
      </List.Section>
      {!isLoading && devices.length === 0 && <List.EmptyView title="No Devices Found" />}
    </List>
  );
};

export default () => {
  return <WemoComponent />;
};

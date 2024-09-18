/* eslint-disable @typescript-eslint/ban-ts-comment */
import type { Device } from "@j3lte/govee-lan-controller";
import { colord } from "colord";
import { useMemo } from "react";

import { Action, ActionPanel, Icon, List, environment } from "@raycast/api";

import type { ScenariosHook } from "@/types";

import useDevice from "@/hooks/useDevice";

import ScenarioForm from "@/components/ScenarioForm";
import SetBrightnessGrid from "@/components/SetBrightnessGrid";
import SetColorGrid from "@/components/SetColorGrid";
import SetCustomNameForm from "@/components/SetCustomNameForm";

export type DeviceListItemProps = {
  device: Device;
  displayName: string | null;
  setName: (deviceId: string, name: string | null) => void;
  scenariosHook: ScenariosHook;
  availableDeviceNames: Record<string, string>;
};

const DeviceListItem = ({ device, displayName, setName, scenariosHook, availableDeviceNames }: DeviceListItemProps) => {
  const { state, actions, dev, ipAddr } = useDevice(device);

  const color = useMemo(() => {
    return colord(state.color).toHex();
  }, [state.color]);

  const accessories: List.Item.Accessory[] = useMemo(() => {
    const arr = [
      {
        tag: `${state.brightness}%`,
        tooltip: "Brightness",
      },
      {
        icon: {
          source: "circle.svg",
          tintColor: color,
        },
      },
    ];
    if (displayName !== null) {
      // @ts-ignore: Icon does seem to work with a tooltip
      arr.unshift({
        icon: {
          source: "custom.svg",
          tintColor: environment.appearance === "dark" ? "#FFFFFF" : "#000000",
        },
        tooltip: `Custom Name, original: ${dev.name}`,
      });
    }
    return arr;
  }, [state.brightness, color, displayName, dev.name]);

  return (
    <List.Item
      key={device.id}
      title={displayName ?? dev.name}
      subtitle={`${dev.model} - ${ipAddr}`}
      icon={state.onOff ? Icon.LightBulb : Icon.LightBulbOff}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Device">
            <Action title="Turn On" onAction={() => actions.turnOn()} icon={Icon.LightBulb} />
            <Action title="Turn Off" onAction={() => actions.turnOff()} icon={Icon.LightBulbOff} />
            <Action
              title="Toggle"
              onAction={() => actions.toggle()}
              icon={Icon.Switch}
              shortcut={{ key: "t", modifiers: ["cmd"] }}
            />
            <Action.Push
              title="Set Brightness"
              target={<SetBrightnessGrid setBrightness={actions.setBrightness} />}
              icon={Icon.Sun}
              shortcut={{ key: "b", modifiers: ["cmd"] }}
            />
            <Action.Push
              title="Set Color"
              target={<SetColorGrid setColor={actions.setColor} />}
              icon={Icon.Pencil}
              shortcut={{ key: "n", modifiers: ["cmd"] }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Naming">
            <Action.Push
              title="Set Custom Name"
              target={
                <SetCustomNameForm
                  deviceId={device.id}
                  deviceName={device.name}
                  currentName={displayName}
                  setName={setName}
                />
              }
              icon={Icon.Pencil}
              shortcut={{ key: "m", modifiers: ["cmd"] }}
            />
            {displayName !== null ? (
              <Action
                title="Clear Custom Name"
                onAction={() => setName(device.id, null)}
                icon={Icon.Xmark}
                shortcut={{ key: "m", modifiers: ["cmd", "ctrl"] }}
              />
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section title="Scenarios">
            <Action.Push
              title="Create Scenario"
              target={
                <ScenarioForm newScenario scenariosHook={scenariosHook} availableDeviceNames={availableDeviceNames} />
              }
              icon={Icon.Plus}
              shortcut={{ key: "s", modifiers: ["cmd", "ctrl"] }}
            />
            <Action.Push
              title="Create Scenario With Current Device"
              target={
                <ScenarioForm
                  newScenario
                  withDevice={device}
                  scenariosHook={scenariosHook}
                  availableDeviceNames={availableDeviceNames}
                />
              }
              icon={Icon.Plus}
              shortcut={{ key: "s", modifiers: ["cmd", "ctrl", "opt"] }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

export default DeviceListItem;

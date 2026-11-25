/* eslint-disable @typescript-eslint/ban-ts-comment */
import type { Device } from "@j3lte/govee-lan-controller";
import { colord } from "colord";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { Action, ActionPanel, Icon, Keyboard, List, environment } from "@raycast/api";

import type { ScenariosHook } from "@/types";

import type { CloudDevice } from "@/lib/cloud";
import { visibleColor } from "@/lib/kelvin";
import { LAN_SEGMENT_MODELS } from "@/lib/lanSegments";

import useDevice from "@/hooks/useDevice";
import type { MusicSensitivity } from "@/hooks/useMusicSensitivity";
import type { SnapshotColors } from "@/hooks/useSnapshotColors";

import MusicModeList from "@/components/MusicModeList";
import ScenarioForm from "@/components/ScenarioForm";
import SegmentColors from "@/components/SegmentColors";
import SetBrightnessGrid from "@/components/SetBrightnessGrid";
import SetColorGrid from "@/components/SetColorGrid";
import SetCustomNameForm from "@/components/SetCustomNameForm";
import SnapshotList from "@/components/SnapshotList";
import WhiteTemperatureGrid from "@/components/WhiteTemperatureGrid";

export type DeviceListItemProps = {
  device: Device;
  displayName: string | null;
  setName: (deviceId: string, name: string | null) => void;
  scenariosHook: ScenariosHook;
  availableDeviceNames: Record<string, string>;
  layoutActions?: ReactNode;
  snapshotColors: SnapshotColors;
  musicSensitivity: MusicSensitivity;
};

const DeviceListItem = ({
  device,
  displayName,
  setName,
  scenariosHook,
  availableDeviceNames,
  layoutActions,
  snapshotColors,
  musicSensitivity,
}: DeviceListItemProps) => {
  const { state, actions, dev, ipAddr } = useDevice(device);
  // Cloud devices set these; LAN devices are always single lights with levels.
  const { isVirtual = false, showLevels = true } = device as Device & { isVirtual?: boolean; showLevels?: boolean };
  // A cloud row is its own cloud device; a LAN row may carry its cloud twin.
  const cloud = (device as unknown as { isCloud?: boolean }).isCloud
    ? (device as unknown as CloudDevice)
    : (device as Device & { cloud?: CloudDevice }).cloud;
  const snapshots = cloud?.snapshots ?? [];
  // White temperature: over LAN when the light is on LAN (fast), otherwise the cloud's temperature mode.
  const lan = device as Device & { isCloud?: boolean };
  const onLan = !lan.isCloud && typeof lan.setColorKelvin === "function";
  // Multicolor over LAN for models known to take segment packets; segment numbers from the cloud
  // when it has them, else from that list (so it works without an API key too).
  const lanCount = onLan ? LAN_SEGMENT_MODELS[device.model] : undefined;
  const segmentList = cloud?.segments.length ? cloud.segments : lanCount ? [...Array(lanCount).keys()] : [];
  const lanSegments = !!lanCount && segmentList.every((s) => s < 15);
  const whiteRange = onLan ? (cloud?.kelvinRange ?? { min: 2000, max: 9000 }) : (cloud?.kelvinRange ?? null);
  const setWhite = (kelvin: number) => (onLan ? lan.setColorKelvin(kelvin) : cloud!.setColorTemperature(kelvin));

  // Lights only report one solid color; white mode reports a temperature instead.
  const kelvin = (dev as { colorTemperature?: number }).colorTemperature;
  const isWhite = state.color.r === 0 && state.color.g === 0 && state.color.b === 0 && !!kelvin;
  const colorTooltip = isWhite ? `White, ${kelvin}K` : "Last solid color";
  const color = useMemo(() => {
    return colord(visibleColor(state.color, (dev as { colorTemperature?: number }).colorTemperature)).toHex();
  }, [state.color]);

  const accessories: List.Item.Accessory[] = useMemo(() => {
    const arr: List.Item.Accessory[] = showLevels
      ? [
          { icon: { source: "circle.svg", tintColor: color }, tooltip: colorTooltip },
          { tag: `${state.brightness}%`, tooltip: "Brightness" },
        ]
      : [];
    if (displayName !== null) {
      // @ts-ignore: Icon does seem to work with a tooltip
      arr.unshift({
        icon: {
          source: "custom.svg",
          tintColor: environment.appearance === "dark" ? "#FFFFFF" : "#000000",
        },
        tooltip: `Renamed, original: ${dev.name}`,
      });
    }
    return arr;
  }, [state.brightness, color, colorTooltip, displayName, dev.name, showLevels]);

  return (
    <List.Item
      key={device.id}
      title={displayName ?? dev.name}
      subtitle={`${dev.model} - ${ipAddr}`}
      icon={isVirtual ? Icon.Layers : state.onOff ? Icon.LightBulb : Icon.LightBulbOff}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Device">
            <Action
              title={state.onOff ? "Toggle (Turn Off)" : "Toggle (Turn On)"}
              onAction={() => actions.toggle()}
              icon={Icon.Switch}
              shortcut={{ key: "t", modifiers: ["cmd"] }}
            />
            <Action
              title="Turn On"
              onAction={() => actions.turnOn()}
              icon={Icon.LightBulb}
              shortcut={{ key: "return", modifiers: ["cmd"] }}
            />
            <Action
              title="Turn Off"
              onAction={() => actions.turnOff()}
              icon={Icon.LightBulbOff}
              shortcut={{ key: "return", modifiers: ["cmd", "shift"] }}
            />
            {showLevels ? (
              <>
                <Action
                  title="Increase Brightness"
                  icon={Icon.Plus}
                  onAction={() => actions.setBrightness(Math.min(100, state.brightness + 10))}
                  shortcut={{ key: "=", modifiers: ["cmd"] }}
                />
                <Action
                  title="Decrease Brightness"
                  icon={Icon.Minus}
                  onAction={() => actions.setBrightness(Math.max(1, state.brightness - 10))}
                  shortcut={{ key: "-", modifiers: ["cmd"] }}
                />
              </>
            ) : null}
            {showLevels ? (
              <>
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
                  shortcut={{ key: "c", modifiers: ["cmd", "opt"] }}
                />
                {whiteRange ? (
                  <Action.Push
                    title="Set White Temperature"
                    icon={Icon.LightBulb}
                    shortcut={{ key: "w", modifiers: ["cmd", "opt"] }}
                    target={<WhiteTemperatureGrid range={whiteRange} apply={setWhite} />}
                  />
                ) : null}
                {segmentList.length > 0 && (lanSegments || cloud?.segments.length) ? (
                  <Action.Push
                    title="Subsection Coloring"
                    icon={Icon.AppWindowGrid3x3}
                    shortcut={{ key: "g", modifiers: ["cmd", "opt"] }}
                    target={
                      <SegmentColors
                        segments={segmentList}
                        name={displayName ?? dev.name}
                        lanIp={lanSegments ? ipAddr : undefined}
                        cloud={cloud?.segments.length ? cloud : undefined}
                      />
                    }
                  />
                ) : null}
              </>
            ) : null}
          </ActionPanel.Section>
          {layoutActions}
          <ActionPanel.Section title="Naming">
            <Action.Push
              title="Rename"
              target={
                <SetCustomNameForm
                  deviceId={device.id}
                  deviceName={device.name}
                  currentName={displayName}
                  setName={setName}
                />
              }
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
            />
            {displayName !== null ? (
              <Action
                title="Reset Name"
                onAction={() => setName(device.id, null)}
                icon={Icon.Xmark}
                shortcut={{ key: "e", modifiers: ["cmd", "shift"] }}
              />
            ) : null}
          </ActionPanel.Section>
          {cloud && (snapshots.length > 0 || cloud.musicModes.length > 0) ? (
            <ActionPanel.Section title="Govee App">
              {snapshots.length > 0 ? (
                <Action.Push
                  title="Snapshots"
                  icon={Icon.Camera}
                  target={
                    <SnapshotList
                      device={cloud}
                      deviceId={device.id}
                      name={displayName ?? dev.name}
                      colorStore={snapshotColors}
                    />
                  }
                  shortcut={{ key: "s", modifiers: ["cmd", "shift"] }}
                />
              ) : null}
              {cloud.musicModes.length > 0 ? (
                <Action.Push
                  title="Music Mode"
                  icon={Icon.Music}
                  target={
                    <MusicModeList
                      device={cloud}
                      deviceId={device.id}
                      name={displayName ?? dev.name}
                      sensitivity={musicSensitivity}
                    />
                  }
                  shortcut={{ key: "m", modifiers: ["cmd", "shift"] }}
                />
              ) : null}
            </ActionPanel.Section>
          ) : null}
          <ActionPanel.Section title="Scenarios">
            <Action.Push
              title="Create Scenario"
              target={
                <ScenarioForm newScenario scenariosHook={scenariosHook} availableDeviceNames={availableDeviceNames} />
              }
              icon={Icon.Plus}
              shortcut={Keyboard.Shortcut.Common.New}
            />
            <Action.Push
              title="Save Current as Scenario"
              target={
                <ScenarioForm
                  newScenario
                  withDevice={device}
                  scenariosHook={scenariosHook}
                  availableDeviceNames={availableDeviceNames}
                />
              }
              icon={Icon.Plus}
              shortcut={{ key: "n", modifiers: ["cmd", "shift"] }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

export default DeviceListItem;

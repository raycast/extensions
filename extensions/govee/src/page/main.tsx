import type { Device } from "@j3lte/govee-lan-controller";
import { useMemo, useState } from "react";

import { Action, ActionPanel, Icon, Keyboard, List, getPreferenceValues, openExtensionPreferences } from "@raycast/api";

import type { Scenario } from "@/types";

import type { CloudDevice } from "@/lib/cloud";
import { sectionOrder } from "@/lib/sections";
import type { SectionKey } from "@/lib/sections";

import useLayout from "@/hooks/useLayout";
import useMusicSensitivity from "@/hooks/useMusicSensitivity";
import useNameMapping from "@/hooks/useNameMapping";
import useScenarios from "@/hooks/useScenarios";
import useSnapshotColors from "@/hooks/useSnapshotColors";

import ListItem from "@/components/DeviceListItem";
import MusicListItem from "@/components/MusicListItem";
import type { MusicRow } from "@/components/MusicListItem";
import ScenarioListItem from "@/components/ScenarioListItem";
import SnapshotListItem from "@/components/SnapshotListItem";
import type { SnapshotRow } from "@/components/SnapshotListItem";

export default function ControlGoveeLightsPage({
  devices,
  isLoading,
  error,
  retryCloud,
  executeScenario,
}: {
  devices: Device[];
  isLoading: boolean;
  /** Last controller or cloud error, shown when there's nothing else to show. */
  error?: Error | null;
  retryCloud?: () => void;
  executeScenario: ({ scenario }: { scenario: Scenario }) => Promise<void>;
}) {
  const { getName, setName } = useNameMapping();

  const scenariosHook = useScenarios();
  const { scenarios } = scenariosHook;

  const layout = useLayout();
  const musicSensitivity = useMusicSensitivity();
  const prefs = getPreferenceValues<Preferences>();
  const order = sectionOrder({
    devices: prefs.devicesPosition,
    scenarios: prefs.scenariosPosition,
    snapshots: prefs.snapshotsPosition,
    music: prefs.musicPosition,
  });
  const snapshotColors = useSnapshotColors();
  const [showHidden, setShowHidden] = useState(false);

  const availableDeviceMappings = useMemo(() => {
    return devices.reduce(
      (acc, device) => {
        acc[device.id] = getName(device.id) ?? device.name;
        return acc;
      },
      {} as Record<string, string>,
    );
  }, [devices, getName]);

  const showHiddenAction = (
    <Action
      title={showHidden ? "Hide Hidden Items" : "Show Hidden Items"}
      icon={showHidden ? Icon.EyeDisabled : Icon.Eye}
      onAction={() => setShowHidden((v) => !v)}
      shortcut={{ key: ".", modifiers: ["cmd", "shift"] }}
    />
  );

  // Moving swaps a row with its neighbour in the section it's displayed in.
  const layoutActions = (id: string, sectionIds: string[]) => (
    <ActionPanel.Section title="Layout">
      <Action
        title="Move Up"
        icon={Icon.ArrowUp}
        onAction={() => layout.move(sectionIds, id, -1)}
        shortcut={Keyboard.Shortcut.Common.MoveUp}
      />
      <Action
        title="Move Down"
        icon={Icon.ArrowDown}
        onAction={() => layout.move(sectionIds, id, 1)}
        shortcut={Keyboard.Shortcut.Common.MoveDown}
      />
      <Action
        title={layout.isHidden(id) ? "Unhide" : "Hide"}
        icon={layout.isHidden(id) ? Icon.Eye : Icon.EyeDisabled}
        onAction={() => layout.toggleHidden(id)}
        shortcut={{ key: "h", modifiers: ["cmd", "shift"] }}
      />
      {showHiddenAction}
    </ActionPanel.Section>
  );

  const sortedDevices = layout.sort(devices);
  const sortedScenarios = layout.sort(scenarios);
  // Snapshots of every light: a cloud row is its own cloud device, a LAN row carries its cloud twin.
  const snapshots: SnapshotRow[] = devices.flatMap((device) => {
    const cloud = (device as unknown as { isCloud?: boolean }).isCloud
      ? (device as unknown as CloudDevice)
      : (device as Device & { cloud?: CloudDevice }).cloud;
    if (!cloud) return [];
    const deviceName = getName(device.id) ?? device.name;
    return cloud.snapshots.map((s) => ({ id: `${device.id}:${s.value}`, ...s, device: cloud, deviceName }));
  });
  const sortedSnapshots = layout.sort(snapshots);
  const music: MusicRow[] = devices.flatMap((device) => {
    const cloud = (device as unknown as { isCloud?: boolean }).isCloud
      ? (device as unknown as CloudDevice)
      : (device as Device & { cloud?: CloudDevice }).cloud;
    if (!cloud) return [];
    const deviceName = getName(device.id) ?? device.name;
    return cloud.musicModes.map((m) => ({ id: `${device.id}:music:${m.value}`, ...m, device: cloud, deviceName }));
  });
  const sortedMusic = layout.sort(music);
  const split = <T extends { id: string }>(items: T[], hidden: boolean) =>
    items.filter((item) => layout.isHidden(item.id) === hidden);

  const renderDevices = (list: Device[]) =>
    list.map((device) => (
      <ListItem
        // Same key for a light's cloud copy and LAN version (useDevice follows the switch), so
        // the row and Raycast's selection stay put when the light is found on LAN.
        key={device.id.toLowerCase()}
        device={device}
        displayName={getName(device.id)}
        setName={setName}
        scenariosHook={scenariosHook}
        availableDeviceNames={availableDeviceMappings}
        snapshotColors={snapshotColors}
        musicSensitivity={musicSensitivity}
        layoutActions={layoutActions(
          device.id,
          list.map((d) => d.id),
        )}
      />
    ));

  const renderScenarios = (list: Scenario[]) =>
    list.map((scenario) => (
      <ScenarioListItem
        key={scenario.id}
        scenario={scenario}
        scenariosHook={scenariosHook}
        availableDeviceNames={availableDeviceMappings}
        execute={() => executeScenario({ scenario })}
        layoutActions={layoutActions(
          scenario.id,
          list.map((s) => s.id),
        )}
      />
    ));

  const renderMusic = (list: MusicRow[]) =>
    list.map((mode) => (
      <MusicListItem
        key={mode.id}
        mode={mode}
        sensitivity={musicSensitivity}
        layoutActions={layoutActions(
          mode.id,
          list.map((m) => m.id),
        )}
      />
    ));

  const renderSnapshots = (list: SnapshotRow[]) =>
    list.map((snapshot) => (
      <SnapshotListItem
        key={snapshot.id}
        snapshot={snapshot}
        colorStore={snapshotColors}
        layoutActions={layoutActions(
          snapshot.id,
          list.map((s) => s.id),
        )}
      />
    ));

  const sections: Record<SectionKey, (hidden: boolean) => JSX.Element> = {
    devices: (hidden) => (
      <List.Section key={`devices-${hidden}`} title={hidden ? "Hidden Devices" : "Devices"}>
        {renderDevices(split(sortedDevices, hidden))}
      </List.Section>
    ),
    scenarios: (hidden) => (
      <List.Section key={`scenarios-${hidden}`} title={hidden ? "Hidden Scenarios" : "Scenarios"}>
        {renderScenarios(split(sortedScenarios, hidden))}
      </List.Section>
    ),
    snapshots: (hidden) => (
      <List.Section key={`snapshots-${hidden}`} title={hidden ? "Hidden Snapshots" : "Snapshots"}>
        {renderSnapshots(split(sortedSnapshots, hidden))}
      </List.Section>
    ),
    music: (hidden) => (
      <List.Section key={`music-${hidden}`} title={hidden ? "Hidden Music Modes" : "Music Modes"}>
        {renderMusic(split(sortedMusic, hidden))}
      </List.Section>
    ),
  };

  return (
    <List isLoading={isLoading || layout.isLoading} searchBarPlaceholder="Search for Govee lights...">
      {layout.isLoading ? null : error && !isLoading ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Couldn't reach your Govee lights"
          description={error.message}
          actions={
            <ActionPanel>
              {retryCloud ? <Action title="Retry" icon={Icon.ArrowClockwise} onAction={retryCloud} /> : null}
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              {showHiddenAction}
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView title="Nothing to show" actions={<ActionPanel>{showHiddenAction}</ActionPanel>} />
      )}
      {/* Rows only once the saved order is in, so Raycast selects the right first row. */}
      {layout.isLoading ? null : order.map((k) => sections[k](false))}
      {showHidden && !layout.isLoading ? order.map((k) => sections[k](true)) : null}
    </List>
  );
}

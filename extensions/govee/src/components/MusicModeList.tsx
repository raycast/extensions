import { List } from "@raycast/api";

import type { CloudDevice } from "@/lib/cloud";

import type { MusicSensitivity } from "@/hooks/useMusicSensitivity";

import MusicListItem from "@/components/MusicListItem";

/** One light's music modes, opened from its device row. */
const MusicModeList = ({
  device,
  deviceId,
  name,
  sensitivity,
}: {
  device: CloudDevice;
  deviceId: string;
  name: string;
  sensitivity: MusicSensitivity;
}) => (
  <List
    navigationTitle={`${name} — Music Mode`}
    searchBarPlaceholder="Search music modes..."
    searchBarAccessory={
      <List.Dropdown
        tooltip="Mic Sensitivity"
        value={String(sensitivity.value)}
        onChange={(v) => sensitivity.set(parseInt(v, 10))}
      >
        <List.Dropdown.Section title="Mic Sensitivity">
          {["25", "50", "75", "100"].map((v) => (
            <List.Dropdown.Item key={v} value={v} title={`Sensitivity ${v}%`} />
          ))}
        </List.Dropdown.Section>
      </List.Dropdown>
    }
  >
    {device.musicModes.map((m) => (
      <MusicListItem
        key={m.value}
        mode={{ id: `${deviceId}:music:${m.value}`, ...m, device, deviceName: name }}
        sensitivity={sensitivity}
      />
    ))}
  </List>
);

export default MusicModeList;

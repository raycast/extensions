import { List } from "@raycast/api";

import type { CloudDevice } from "@/lib/cloud";

import type { SnapshotColors } from "@/hooks/useSnapshotColors";

import SnapshotListItem from "@/components/SnapshotListItem";

/** One light's snapshots, opened from its device row. */
const SnapshotList = ({
  device,
  deviceId,
  name,
  colorStore,
}: {
  device: CloudDevice;
  deviceId: string;
  name: string;
  colorStore: SnapshotColors;
}) => (
  <List navigationTitle={`${name} — Snapshots`} searchBarPlaceholder="Search snapshots...">
    {device.snapshots.map((s) => (
      <SnapshotListItem
        key={s.value}
        // Same id as the main list's row, so colours set here show up there too.
        snapshot={{ id: `${deviceId}:${s.value}`, ...s, device, deviceName: name }}
        colorStore={colorStore}
      />
    ))}
  </List>
);

export default SnapshotList;

import { ActionPanel, List, Action } from "@raycast/api";

import { Volume } from "../types";

export default function VolumeListItem(props: { volume: Volume; eject: (volume: Volume) => Promise<void> }) {
  const { volume, eject } = props;

  return (
    <List.Item
      id={volume.name}
      key={volume.name}
      title={volume.name}
      subtitle="Select to eject"
      icon="list-icon.png"
      actions={
        <ActionPanel>
          <Action title="Eject Volume" onAction={() => eject(volume)} />
        </ActionPanel>
      }
    />
  );
}

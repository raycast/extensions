import { List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item
        title="Add Clip"
        actions={
          <ActionPanel>
            <Action.Push title="Add Clip" target={<AddClip />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="View Clips"
        actions={
          <ActionPanel>
            <Action.Push title="View Clips" target={<ClipGallery />} />
          </ActionPanel>
        }
      />
    </List>
  );
}

import AddClip from "./add-clip";
import ClipGallery from "./clip-gallery";
import { Action, ActionPanel } from "@raycast/api";

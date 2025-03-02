import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { NestCamera } from "../types";

export function CameraListItem(props: { camera: NestCamera; onAction: (camera: NestCamera) => void }) {
  const { camera, onAction } = props;

  return (
    <List.Item
      id={camera.id}
      title={camera.name}
      subtitle={camera.roomHint || ""}
      accessories={[
        {
          tag: camera.traits.streamingSupport,
          icon: camera.traits.online ? Icon.CircleFilled : Icon.Circle,
          tooltip: camera.traits.online ? "Online" : "Offline",
        },
      ]}
      actions={
        <ActionPanel>
          <Action title="View Camera" icon={Icon.Eye} onAction={() => onAction(camera)} />
        </ActionPanel>
      }
    />
  );
}

import { ActionPanel, Detail } from "@raycast/api";
import { ActionCopyWallpaper, ActionSetWallpaper } from "./Actions";

export default function PreviewDetail({ itemPath }: { itemPath: string }) {
  return (
    <Detail
      markdown={`![](${itemPath})`}
      actions={
        <ActionPanel>
          <ActionSetWallpaper itemPath={itemPath} />
          <ActionCopyWallpaper itemPath={itemPath} />
        </ActionPanel>
      }
    />
  );
}

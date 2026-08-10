import { Action, ActionPanel, Icon } from "@raycast/api";
import { ReleaseResource } from "../prowlarrApi";

export function SearchResultActionPanel({
  item,
  onAction,
}: {
  item: ReleaseResource;
  onAction: (params: { action: "addToDownloadClient"; item: ReleaseResource } | { action: "toggleDetails" }) => void;
}) {
  return (
    <ActionPanel>
      <Action
        title="Add to Download Client"
        icon={Icon.Plus}
        onAction={() => onAction({ action: "addToDownloadClient", item })}
      />
      <Action title={"Toggle Details"} icon={Icon.Sidebar} onAction={() => onAction({ action: "toggleDetails" })} />
      {!!item.magnetUrl && <Action.CopyToClipboard title="Copy Magnet URL" content={item.magnetUrl} />}
      {!!item.downloadUrl && <Action.CopyToClipboard title="Copy Download URL" content={item.downloadUrl} />}
    </ActionPanel>
  );
}

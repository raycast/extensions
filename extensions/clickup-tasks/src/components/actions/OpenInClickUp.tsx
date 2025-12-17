import { Action } from "@raycast/api";
import { Shortcuts } from "../../constants/shortcuts";

interface OpenInClickUpProps extends Pick<Action.OpenInBrowser.Props, "url"> {
  isDefault?: boolean;
}

export function OpenInClickUp({ isDefault = false, url }: OpenInClickUpProps) {
  return (
    <Action.OpenInBrowser
      shortcut={isDefault ? undefined : Shortcuts.OpenInBrowser}
      title="Open in ClickUp"
      url={url}
    />
  );
}

import { Action } from "@raycast/api";

import { Shortcuts } from "../../constants/shortcuts";

interface Props extends Pick<Action.OpenInBrowser.Props, "url"> {
  isDefault?: boolean;
}

export function OpenInClickUp({ isDefault = false, url }: Props) {
  return (
    <Action.OpenInBrowser
      shortcut={isDefault ? undefined : Shortcuts.OpenInBrowser}
      title="Open in Clickup"
      url={url}
    />
  );
}

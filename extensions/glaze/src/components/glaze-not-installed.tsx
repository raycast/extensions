import {
  Action,
  ActionPanel,
  Detail,
  openExtensionPreferences,
} from "@raycast/api";
import { TARGET_APP } from "../lib/paths";
export function GlazeNotInstalled() {
  return (
    <Detail
      markdown={`# ${TARGET_APP.name} Not Found\n\nInstall ${TARGET_APP.name} in Applications, or change Target App in this extension’s settings.`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Get Glaze" url="https://www.glaze.app" />
          <Action
            title="Open Extension Settings"
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    />
  );
}

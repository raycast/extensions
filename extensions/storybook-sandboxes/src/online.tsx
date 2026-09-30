import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { openExtensionPreferences } from "@raycast/api";
import { SandboxList } from "./components/sandbox-list";
import { toStackBlitzLink } from "./utils/to-stackblitz-link";

const Online = () => {
  return (
    <SandboxList
      actions={(key) => (
        <ActionPanel>
          <Action.OpenInBrowser title="Open in StackBlitz" url={toStackBlitzLink(key)} />
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
            shortcut={{ key: "p", modifiers: ["cmd", "shift"] }}
          />
        </ActionPanel>
      )}
    />
  );
};

export default Online;

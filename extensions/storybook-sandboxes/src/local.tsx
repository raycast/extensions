import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { openExtensionPreferences } from "@raycast/api";
import { SandboxList } from "./components/sandbox-list";
import { LocalSandboxForm } from "./components/local-sandbox-form";
import { SandboxKey } from "./utils/sandboxes";

const Local = () => {
  return (
    <SandboxList
      actions={(key, sandbox) => (
        <ActionPanel>
          <Action.Push
            title="Create Local Sandbox"
            icon={Icon.HardDrive}
            target={<LocalSandboxForm sandboxKey={key as SandboxKey} sandbox={sandbox} />}
          />
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

export default Local;

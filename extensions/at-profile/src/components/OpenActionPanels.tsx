import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import CustomAppForm from "../forms/custom-app-form";
import HistoryCommand from "../history";
import ManageAppsCommand from "./ManageApps";

interface OpenActionPanelsProps {
  onSubmit: (values: { profile: string; app: string }) => Promise<void>;
}

export default function OpenActionPanels({ onSubmit }: OpenActionPanelsProps) {
  return (
    <ActionPanel>
      <Action.SubmitForm title="Open Profile" icon={Icon.Globe} onSubmit={onSubmit} />
      <Action.Push
        title="Open History"
        icon={Icon.Clock}
        target={<HistoryCommand />}
        shortcut={Keyboard.Shortcut.Common.Open}
      />
      <ActionPanel.Section>
        <Action.Push
          title="Add Custom App"
          icon={Icon.Plus}
          target={<CustomAppForm />}
          shortcut={Keyboard.Shortcut.Common.New}
        />
        <Action.Push
          title="Manage Apps"
          icon={Icon.Gear}
          target={<ManageAppsCommand />}
          shortcut={{ modifiers: ["cmd"], key: "m" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

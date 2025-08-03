import { ActionPanel, Action, Icon, LaunchType } from "@raycast/api";
import ManageAppsCommand from "../utils/manage-apps";
import HistoryCommand from "../history";

// Wrapper component for ManageAppsCommand to handle LaunchProps
function ManageAppsWrapper() {
  return <ManageAppsCommand arguments={{}} launchType={LaunchType.UserInitiated} />;
}

// Wrapper component for HistoryCommand to handle LaunchProps
function HistoryWrapper() {
  return <HistoryCommand />;
}

interface OpenActionPanelsProps {
  onSubmit: (values: { profile: string; app: string }) => Promise<void>;
}

export default function OpenActionPanels({ onSubmit }: OpenActionPanelsProps) {
  return (
    <ActionPanel>
      <Action.SubmitForm title="Open Profile" icon={Icon.Globe} onSubmit={onSubmit} />
      <ActionPanel.Section>
        <Action.Push
          title="Manage Apps"
          icon={Icon.Gear}
          target={<ManageAppsWrapper />}
          shortcut={{ modifiers: ["cmd"], key: "m" }}
        />
        <Action.Push
          title="Open History"
          icon={Icon.Clock}
          target={<HistoryWrapper />}
          shortcut={{ modifiers: ["cmd"], key: "h" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

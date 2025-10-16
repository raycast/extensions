import { ActionPanel, Action, Icon, LaunchType } from "@raycast/api";
import ManageAppsCommand from "./ManageApps";
import HistoryCommand from "../history";
import CustomAppForm from "../forms/custom-app-form";

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
  onSave: () => void;
}

export default function OpenActionPanels({ onSubmit, onSave }: OpenActionPanelsProps) {
  return (
    <ActionPanel>
      <Action.SubmitForm title="Open Profile" icon={Icon.Globe} onSubmit={onSubmit} />
      <Action.Push
        title="Open History"
        icon={Icon.Clock}
        target={<HistoryWrapper />}
        shortcut={{ modifiers: ["cmd"], key: "h" }}
      />
      <ActionPanel.Section>
        <Action.Push
          title="Add Custom App"
          icon={Icon.Plus}
          target={<CustomAppForm onSave={onSave} />}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
        />
        <Action.Push
          title="Manage Apps"
          icon={Icon.Gear}
          target={<ManageAppsWrapper />}
          shortcut={{ modifiers: ["cmd"], key: "m" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

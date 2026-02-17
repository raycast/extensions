import { ActionPanel, Action, Icon, List, Color } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import AddWorkspaceForm from "./AddWorkspaceForm";
import SelectEditor from "./SelectEditor";
import { App } from "../types";

interface WalkthroughProps {
  onComplete: () => void;
  workspaces: string[];
  defaultApp: App | null;
  loadData: () => Promise<void>;
}

export default function Walkthrough({ onComplete, workspaces, defaultApp, loadData }: WalkthroughProps) {
  const hasWorkspaces = workspaces.length > 0;
  const hasApp = !!defaultApp;
  const isReady = hasWorkspaces && hasApp;

  const handleFinish = async () => {
    onComplete();
  };

  return (
    <List>
      <List.Section title="Workspace">
        <List.Item
          title="1. Add Workspace"
          subtitle={hasWorkspaces ? `${workspaces[0]}` : "Select a folder containing your projects"}
          icon={getProgressIcon(hasWorkspaces ? 1 : 0, Color.Green)}
          actions={
            <ActionPanel>
              <Action.Push title="Add Workspace" icon={Icon.Folder} target={<AddWorkspaceForm />} onPop={loadData} />
            </ActionPanel>
          }
        />
        <List.Item
          title="2. Default App"
          subtitle={hasApp ? `Selected App: ${defaultApp.name}` : "Choose the app to open your projects"}
          icon={getProgressIcon(hasApp ? 1 : 0, Color.Green)}
          actions={
            <ActionPanel>
              <Action.Push title="Select Editor" icon={Icon.AppWindow} target={<SelectEditor />} onPop={loadData} />
            </ActionPanel>
          }
        />
        {isReady && (
          <List.Item
            title="3. Finish Setup"
            subtitle="You're ready to go!"
            icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
            actions={
              <ActionPanel>
                <Action title="Finish Walkthrough" icon={Icon.Check} onAction={handleFinish} />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
    </List>
  );
}

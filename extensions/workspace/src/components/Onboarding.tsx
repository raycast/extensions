import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";

import AddWorkspaceForm from "@/components/AddWorkspaceForm";
import SelectEditor from "@/components/SelectEditor";
import { App } from "@/types";

interface OnboardingProps {
  defaultApp: App | null;
  loadData: () => Promise<void>;
  onComplete: () => void;
  workspaces: string[];
}

export default function Onboarding({ defaultApp, loadData, onComplete, workspaces }: OnboardingProps) {
  const hasWorkspaces = workspaces.length > 0;
  const hasApp = !!defaultApp;
  const isReady = hasWorkspaces && hasApp;

  return (
    <List>
      <List.Section title="Workspace">
        <List.Item
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Folder} onPop={loadData} target={<AddWorkspaceForm />} title="Add Workspace" />
            </ActionPanel>
          }
          icon={getProgressIcon(hasWorkspaces ? 1 : 0, Color.Green)}
          subtitle={hasWorkspaces ? `${workspaces[0]}` : "Select a folder containing your projects"}
          title="1. Add Workspace"
        />
        <List.Item
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.AppWindow} onPop={loadData} target={<SelectEditor />} title="Select App" />
            </ActionPanel>
          }
          icon={getProgressIcon(hasApp ? 1 : 0, Color.Green)}
          subtitle={hasApp ? `Selected App: ${defaultApp.name}` : "Choose the app to open your projects"}
          title="2. Default App"
        />
        {isReady && (
          <List.Item
            actions={
              <ActionPanel>
                <Action icon={Icon.Check} onAction={onComplete} title="Finish Onboarding" />
              </ActionPanel>
            }
            icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
            subtitle="You're ready to go!"
            title="3. Finish Setup"
          />
        )}
      </List.Section>
    </List>
  );
}

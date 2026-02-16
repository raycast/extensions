import { ActionPanel, Action, Icon, List, Color } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import AddWorkspaceForm from "./AddWorkspaceForm";
import SelectEditor from "./SelectEditor";
import { App } from "../types";
import { useI18n } from "../hooks/useI18n";

interface WalkthroughProps {
  onComplete: () => void;
  workspaces: string[];
  defaultApp: App | null;
  loadData: () => Promise<void>;
}

export default function Walkthrough({ onComplete, workspaces, defaultApp, loadData }: WalkthroughProps) {
  const { t } = useI18n();
  const hasWorkspaces = workspaces.length > 0;
  const hasApp = !!defaultApp;
  const isReady = hasWorkspaces && hasApp;

  const handleFinish = async () => {
    onComplete();
  };

  return (
    <List>
      <List.Section title={t("walkthrough.title")}>
        <List.Item
          title={t("walkthrough.step1.title")}
          subtitle={hasWorkspaces ? `${workspaces[0]}` : t("walkthrough.step1.subtitle")}
          icon={getProgressIcon(hasWorkspaces ? 1 : 0, Color.Green)}
          actions={
            <ActionPanel>
              <Action.Push
                title={t("walkthrough.actions.addWorkspace")}
                icon={Icon.Folder}
                target={<AddWorkspaceForm />}
                onPop={loadData}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title={t("walkthrough.step2.title")}
          subtitle={hasApp ? `Selected App: ${defaultApp.name}` : t("walkthrough.step2.subtitle")}
          icon={getProgressIcon(hasApp ? 1 : 0, Color.Green)}
          actions={
            <ActionPanel>
              <Action.Push
                title={t("walkthrough.actions.selectEditor")}
                icon={Icon.AppWindow}
                target={<SelectEditor />}
                onPop={loadData}
              />
            </ActionPanel>
          }
        />
        {isReady && (
          <List.Item
            title={t("walkthrough.step3.title")}
            subtitle={t("walkthrough.step3.subtitle")}
            icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
            actions={
              <ActionPanel>
                <Action title={t("walkthrough.actions.finish")} icon={Icon.Check} onAction={handleFinish} />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
    </List>
  );
}

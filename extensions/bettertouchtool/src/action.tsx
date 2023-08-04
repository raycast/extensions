import { ActionPanel, Action, List, Icon, getPreferenceValues } from "@raycast/api";
import actions from "./actions.json";
import { exec } from "child_process";
import icons from "./icons";

interface ActionResult {
  id: string;
  name: string;
  type: number;
  keywords?: string[];
  icon?: string;
}

export default function Command() {
  return (
    <List searchBarPlaceholder="Search actions..." throttle>
      <List.Section title="Actions" subtitle={actions?.length + ""}>
        {actions?.map((actionResult: ActionResult) => (
          <ActionItem key={actionResult.type} actionResult={actionResult} />
        ))}
      </List.Section>
    </List>
  );
}

function ActionItem({ actionResult }: { actionResult: ActionResult }) {
  const preferences: Preferences.Action = getPreferenceValues();
  const shared_secret = preferences.bttSharedSecret;
  const sharedSecretString = shared_secret ? `shared_secret "${shared_secret}"` : "";
  const handleRun = async () => {
    const osaCommand = `tell application "BetterTouchTool" to trigger_action "{\\"BTTPredefinedActionType\\":${actionResult.type}}" ${sharedSecretString}`;
    try {
      await exec(`osascript -e '${osaCommand}'`, (error) => {
        if (error) {
          console.log(`error: ${error.message}`);
          return;
        }
      });
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <List.Item
      id={actionResult.type.toString()}
      title={actionResult.name}
      icon={actionResult.icon ? icons[actionResult.icon as keyof typeof icons] || Icon.QuestionMarkCircle : Icon.Dot}
      accessories={[
        {
          tag: actionResult.id,
          icon: actionResult.icon ? icons[actionResult.icon as keyof typeof icons] || Icon.Info : Icon.Info,
        },
      ]}
      keywords={actionResult?.keywords || []}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Run Action with BTT" onAction={handleRun} icon={Icon.Play} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

import { ActionPanel, Action, List, Icon } from "@raycast/api";
import actions from "./actions.json";
import { exec } from "child_process";

interface ActionResult {
  name: string;
  type: number;
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
  const handleRun = async () => {
    const osaCommand = `tell application "BetterTouchTool" to trigger_action "{\\"BTTPredefinedActionType\\":${actionResult.type}}"`;
    await exec(`osascript -e '${osaCommand}'`, (error) => {
      if (error) {
        console.log(`error: ${error.message}`);
        return;
      }
    });
  };
  return (
    <List.Item
      title={actionResult.name}
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

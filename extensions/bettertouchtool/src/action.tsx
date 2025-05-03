import {
  ActionPanel,
  Action,
  List,
  Icon,
  getPreferenceValues,
  closeMainWindow,
  Form,
  useNavigation,
} from "@raycast/api";
import actions from "./actions.json";
import icons from "./icons";
import { runAppleScript, showFailureToast } from "@raycast/utils";

interface ActionResult {
  id: string;
  name: string;
  type: number;
  keywords?: string[];
  icon?: string;
  param?: string;
}

export default function Command() {
  return (
    <List searchBarPlaceholder="Search actions...">
      <List.Section title="Actions" subtitle={actions?.length + ""}>
        {actions?.map((actionResult: ActionResult) => (
          <ActionItem key={actionResult.type} actionResult={actionResult} />
        ))}
      </List.Section>
    </List>
  );
}

function ActionInput({ actionResult }: { actionResult: ActionResult }) {
  async function handleSubmit(values: { param: string }) {
    const preferences: Preferences.Action = getPreferenceValues();
    const shared_secret = preferences.bttSharedSecret;

    const jsxCommand = `
      var BetterTouchTool = Application('BetterTouchTool');
      var actionDefinition = {
        "BTTPredefinedActionType": ${actionResult.type},
        ${actionResult.param ? `"${actionResult.param}": "${values.param}"` : ""}
      };
      BetterTouchTool.trigger_action(JSON.stringify(actionDefinition), { shared_secret: "${shared_secret}" });
    `;

    await runAppleScript(jsxCommand, { language: "JavaScript" });
  }
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="param" title={actionResult.param} placeholder="Enter a value for the parameter input" />
    </Form>
  );
}

function ActionItem({ actionResult }: { actionResult: ActionResult }) {
  const { push } = useNavigation();
  const preferences: Preferences.Action = getPreferenceValues();
  const shared_secret = preferences.bttSharedSecret;
  const sharedSecretString = shared_secret ? `shared_secret "${shared_secret}"` : "";
  const handleRun = async (closeWindow = false) => {
    if (actionResult.param) {
      return push(<ActionInput actionResult={actionResult} />);
    }
    if (closeWindow) {
      await closeMainWindow();
    }

    try {
      const osaCommand = `tell application "BetterTouchTool" to trigger_action "{\\"BTTPredefinedActionType\\":${actionResult.type}}" ${sharedSecretString}`;
      await runAppleScript(osaCommand);
    } catch (error) {
      console.error(error);
      showFailureToast(error);
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
            <Action title="Run Action with BTT" onAction={() => handleRun()} icon={Icon.PlayFilled} />
            <Action title="Run Action in Background" onAction={() => handleRun(true)} icon={Icon.Play} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

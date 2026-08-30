import { ActionPanel, Action, List, Icon, closeMainWindow, Form, useNavigation } from "@raycast/api";
import actions from "./actions.json";
import icons from "./icons";
import { showFailureToast } from "@raycast/utils";
import { actions as bttActions } from "bettertouchtool";
import { createBttClient } from "./btt";

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
    try {
      await createBttClient().triggerAction(
        bttActions.action(actionResult.type, actionResult.param ? { [actionResult.param]: values.param } : {})
      );
    } catch (error) {
      await showFailureToast(error, { title: "Failed to run action" });
    }
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
  const handleRun = async (closeWindow = false) => {
    if (actionResult.param) {
      return push(<ActionInput actionResult={actionResult} />);
    }
    if (closeWindow) {
      await closeMainWindow();
    }

    try {
      await createBttClient().triggerAction(bttActions.action(actionResult.type));
    } catch (error) {
      await showFailureToast(error, { title: "Failed to run action" });
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

import {
  Action,
  ActionPanel,
  closeMainWindow,
  Form,
  popToRoot,
  showToast,
  Toast,
  List,
  useNavigation,
  Icon,
} from "@raycast/api";
import { useState } from "react";
import Style = Toast.Style;
import open from "open";
import { LocalStorage } from "@raycast/api";
import { CallbackUrl } from "./utils/CallbackUrlUtils";
import { CallbackBaseUrls } from "./utils/Defines";
import { checkAppInstallation } from "./utils/ApplicationInstalledCheck";

interface DraftsAction {
  actionName: string;
  requiresInput: boolean;
}

function AddAction(props: { defaultTitle?: string; onCreate: (action: DraftsAction) => void }) {
  return (
    <Action.Push
      icon={Icon.Plus}
      title="Add Action"
      shortcut={{ modifiers: ["opt"], key: "a" }}
      target={<AddActionForm onCreate={props.onCreate} />}
    />
  );
}

function RunActionWithoutInput(props: { onOpen: () => void }) {
  return <Action icon={Icon.ArrowRight} title="Run Action without Input" onAction={props.onOpen} />;
}

interface CommandForm {
  content: string;
}

function RunActionWithInput(action: DraftsAction) {
  async function handleRunAction(values: CommandForm) {
    const callbackUrl = new CallbackUrl(CallbackBaseUrls.CREATE_DRAFT);
    callbackUrl.addParam({ name: "text", value: values.content });
    callbackUrl.addParam({ name: "action", value: action.actionName });
    callbackUrl.openCallbackUrl();
    await popToRoot({ clearSearchBar: true });
    await closeMainWindow();
  }
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleRunAction} title="Run Action" />
        </ActionPanel>
      }
    >
      <Form.TextArea id="content" title="Input" placeholder="Enter input for Action" defaultValue="" autoFocus={true} />
    </Form>
  );
}

function RemoveAction(props: { onDelete: () => void }) {
  return (
    <Action
      icon={Icon.Trash}
      title="Remove Action"
      shortcut={{ modifiers: ["opt"], key: "d" }}
      onAction={props.onDelete}
    />
  );
}

function AddActionForm(props: { onCreate: (action: DraftsAction) => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { actionName: string; requiresInput: boolean }) {
    if (values.actionName.length > 0) {
      props.onCreate({ actionName: values.actionName, requiresInput: values.requiresInput });
      pop();
    } else {
      await showToast({
        style: Style.Failure,
        title: "Action Name must not be empty!",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Action" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="actionName" title="Add Action" />
      <Form.Checkbox
        id="requiresInput"
        title="ask for input"
        defaultValue={true}
        label="if checked the action will ask for a text input when you run it"
      />
    </Form>
  );
}

export default function Command() {
  // app installation check (shows Toast if Drafts is not installed)
  checkAppInstallation();

  const [actions, setActions] = useState<DraftsAction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  async function readStoredActions() {
    const retrievedStoredActions = await LocalStorage.getItem<string>("stored-actions");
    if (retrievedStoredActions) {
      const draftsActions: DraftsAction[] = JSON.parse(retrievedStoredActions);
      setActions(draftsActions);
    }
    setIsLoading(false);
  }
  async function updateStoredActionNames(newActions: DraftsAction[]) {
    const stringifiedActions = JSON.stringify(newActions);
    await LocalStorage.setItem("stored-actions", stringifiedActions);
    readStoredActions();
  }

  if (actions.length == 0) {
    readStoredActions();
  }

  async function handleAddAction(action: DraftsAction) {
    const newActions = [...actions, action];
    updateStoredActionNames(newActions);
    setActions(newActions);
    await showToast({
      style: Style.Success,
      title: 'Added Action "' + action.actionName + '"',
    });
  }

  async function handleRunAction(values: { actionName: string }) {
    open("drafts://x-callback-url/runAction?text=&action=" + values.actionName);
    await popToRoot({ clearSearchBar: true });
    await closeMainWindow();
  }

  async function handleRemoveAction(index: number) {
    const newActions = [...actions];
    newActions.splice(index, 1);
    updateStoredActionNames(newActions);
    setActions(newActions);
    await showToast({
      style: Style.Success,
      title: "Removed Action",
    });
  }

  function dispatchRunAction(action: DraftsAction) {
    if (action.requiresInput) {
      return (
        <Action.Push
          title="Run Action with Input"
          target={<RunActionWithInput actionName={action.actionName} requiresInput={true} />}
        />
      );
    } else {
      return <RunActionWithoutInput onOpen={() => handleRunAction(action)} />;
    }
  }

  function dispatchCreateQuicklinkAction(action: DraftsAction) {
    if (action.requiresInput) {
      return (
        <Action.CreateQuicklink
          quicklink={{
            link: CallbackBaseUrls.RUN_ACTION + "action=" + encodeURIComponent(action.actionName) + "&text={text}",
          }}
          icon={Icon.Link}
          title={'Create Quicklink to run Action "' + action.actionName + '"'}
        />
      );
    } else {
      return (
        <Action.CreateQuicklink
          quicklink={{ link: CallbackBaseUrls.RUN_ACTION + "action=" + encodeURIComponent(action.actionName) }}
          icon={Icon.Link}
          title={'Create Quicklink to run Action "' + action.actionName + '"'}
        />
      );
    }
  }

  return (
    <List
      navigationTitle="Search Drafts Actions"
      searchBarPlaceholder="Search Drafts Actions you want to run"
      actions={
        <ActionPanel>
          <AddAction onCreate={handleAddAction} />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <List.EmptyView
        actions={
          <ActionPanel>
            <AddAction onCreate={handleAddAction} />
          </ActionPanel>
        }
        title="No (matching) Actions Configured!"
        description="Configure Actions you want to run from Raycast"
        icon="⚙️"
      />
      <List.Item
        title="Deprecated Command"
        subtitle="Please use the Command 'Find Drafts Action' or 'Find Latest Drafts Action' instead."
        icon={Icon.Warning}
      />
      {actions.map((action, index) => (
        <List.Item
          key={index}
          title={action.actionName}
          icon={Icon.List}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                {dispatchRunAction(action)}
                {dispatchCreateQuicklinkAction(action)}
                <RemoveAction onDelete={() => handleRemoveAction(index)} />
              </ActionPanel.Section>
              <AddAction onCreate={handleAddAction} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

//Action.Push title="Push Pong" target={<Pong />} /

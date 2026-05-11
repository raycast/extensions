import {
  Action,
  ActionPanel,
  closeMainWindow,
  Form,
  Icon,
  List,
  LocalStorage,
  popToRoot,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { checkAppInstallation } from "./utils/ApplicationInstalledCheck";
import { CallbackUrl } from "./utils/CallbackUrlUtils";
import { CallbackBaseUrls } from "./utils/Defines";
import Style = Toast.Style;

interface DraftsWorkspace {
  workspaceName: string;
}

function AddWorkspaceAction(props: { defaultTitle?: string; onCreate: (workspace: DraftsWorkspace) => void }) {
  return (
    <Action.Push
      icon={Icon.Plus}
      title="Add Workspace"
      shortcut={{ modifiers: ["opt"], key: "a" }}
      target={<AddWorkspaceForm onCreate={props.onCreate} />}
    />
  );
}

function OpenWorkspaceAction(props: { onOpen: () => void }) {
  return <Action icon={Icon.ArrowRight} title="Open Workspace" onAction={props.onOpen} />;
}

function RemoveWorkspaceAction(props: { onDelete: () => void }) {
  return (
    <Action
      icon={Icon.Trash}
      title="Remove Workspace"
      shortcut={{ modifiers: ["opt"], key: "d" }}
      onAction={props.onDelete}
    />
  );
}

function AddWorkspaceForm(props: { onCreate: (workspace: DraftsWorkspace) => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { workspaceName: string }) {
    if (values.workspaceName.length > 0) {
      props.onCreate({ workspaceName: values.workspaceName });
      pop();
    } else {
      await showToast({
        style: Style.Failure,
        title: "Workspace Name must not be empty!",
        message: "copy the exact name from an existing workspace in Drafts",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Workspace" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="workspaceName" title="Add Workspace" />
    </Form>
  );
}

export default function Command() {
  // app installation check (shows Toast if Drafts is not installed)
  checkAppInstallation();

  const [workspaces, setWorkspaces] = useState<DraftsWorkspace[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  async function readStoredWorkspaces() {
    const retrievedStoredWorkspaces = await LocalStorage.getItem<string>("stored-workspaces");
    if (retrievedStoredWorkspaces) {
      const wsNameArray = retrievedStoredWorkspaces.split(",");
      setWorkspaces(
        wsNameArray.map((name) => {
          const ws: DraftsWorkspace = { workspaceName: name };
          return ws;
        })
      );
    }
    setIsLoading(false);
  }
  async function updateStoredWorkspaceNames(newWorkspaces: DraftsWorkspace[]) {
    await LocalStorage.setItem(
      "stored-workspaces",
      newWorkspaces.map((workspace) => workspace.workspaceName).join(",")
    );
    readStoredWorkspaces();
  }

  if (workspaces.length == 0) {
    readStoredWorkspaces();
  }

  async function handleAddWorkspace(workspace: DraftsWorkspace) {
    const newWorkspaces = [...workspaces, workspace];
    updateStoredWorkspaceNames(newWorkspaces);
    setWorkspaces(newWorkspaces);
    await showToast({
      style: Style.Success,
      title: 'Added Workspace "' + workspace.workspaceName + '"',
    });
  }

  async function handleOpenWorkspace(values: { workspaceName: string }) {
    const callbackUrl = new CallbackUrl(CallbackBaseUrls.OPEN_WORKSPACE);
    callbackUrl.addParam({ name: "name", value: values.workspaceName });
    await callbackUrl.openCallbackUrl();
    await popToRoot({ clearSearchBar: true });
    await closeMainWindow();
  }

  async function handleRemoveWorksapce(index: number) {
    const newWorkspaces = [...workspaces];
    newWorkspaces.splice(index, 1);
    updateStoredWorkspaceNames(newWorkspaces);
    setWorkspaces(newWorkspaces);
    await showToast({
      style: Style.Success,
      title: "Removed Workspace",
    });
  }

  return (
    <List
      actions={
        <ActionPanel>
          <AddWorkspaceAction onCreate={handleAddWorkspace} />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <List.EmptyView
        actions={
          <ActionPanel>
            <AddWorkspaceAction onCreate={handleAddWorkspace} />
          </ActionPanel>
        }
        title="No (matching) Workspace Configured!"
        description="Configure Workspaces you want to open from Raycast"
        icon="⚙️"
      />
      <List.Item
        title="Deprecated Command"
        subtitle="Please use the Command 'Find Workspace' instead."
        icon={Icon.Warning}
      />
      {workspaces.map((workspace, index) => (
        <List.Item
          key={index}
          title={workspace.workspaceName}
          icon={Icon.List}
          actions={
            <ActionPanel>
              <ActionPanel.Section title={"Workspace " + workspace.workspaceName}>
                <OpenWorkspaceAction onOpen={() => handleOpenWorkspace(workspace)} />
                <Action.CreateQuicklink
                  quicklink={{
                    link: CallbackBaseUrls.OPEN_WORKSPACE + "name=" + encodeURIComponent(workspace.workspaceName),
                  }}
                  icon={Icon.Link}
                  title={'Create Quicklink to open Workspace "' + workspace.workspaceName + '"'}
                  key={index}
                />
                <RemoveWorkspaceAction onDelete={() => handleRemoveWorksapce(index)} />
              </ActionPanel.Section>
              <AddWorkspaceAction onCreate={handleAddWorkspace} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

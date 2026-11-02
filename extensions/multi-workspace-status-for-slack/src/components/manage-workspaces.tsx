import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  open,
  showToast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { SLACK_APPS_URL, SLACK_APP_MANIFEST } from "../lib/manifest";
import { Workspace, verifyToken } from "../lib/slack";
import { loadWorkspaces, removeWorkspace, saveWorkspace } from "../lib/storage";

function AddWorkspaceForm({ onAdded }: { onAdded: () => Promise<void> }) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(values: { token: string }) {
    setIsSubmitting(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Checking token…" });
    try {
      const workspace = await verifyToken(values.token);
      await saveWorkspace(workspace);
      toast.style = Toast.Style.Success;
      toast.title = `Added ${workspace.name}`;
      await onAdded();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Token not accepted";
      toast.message = error instanceof Error ? error.message : String(error);
      setIsSubmitting(false);
    }
  }

  async function openSlack() {
    await Clipboard.copy(SLACK_APP_MANIFEST);
    await open(SLACK_APPS_URL);
    await showToast({ style: Toast.Style.Success, title: "Copied app manifest" });
  }

  return (
    <Form
      navigationTitle="Add Workspace"
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Workspace" icon={Icon.Plus} onSubmit={submit} />
          <Action
            title="Copy Manifest and Open Slack"
            icon={Icon.Globe}
            shortcut={Keyboard.Shortcut.Common.OpenWith}
            onAction={openSlack}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Setup"
        text={
          "1. Press ⌘⇧O to copy the app manifest and open Slack.\n2. Select “From a manifest”, choose your workspace, and paste the manifest as JSON.\n3. Under “OAuth & Permissions”, click “Install to Workspace”.\n4. Paste the “User OAuth Token” below."
        }
      />
      <Form.PasswordField id="token" title="User OAuth Token" placeholder="xoxp-…" />
    </Form>
  );
}

export default function ManageWorkspaces({ onChange }: { onChange: () => Promise<void> }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>();

  async function reload() {
    setWorkspaces(await loadWorkspaces());
  }

  async function changed() {
    await reload();
    await onChange();
  }

  useEffect(() => {
    reload();
  }, []);

  async function remove(workspace: Workspace) {
    const confirmed = await confirmAlert({
      title: `Remove ${workspace.name}?`,
      message: "This deletes the token from Raycast. The app stays installed in Slack.",
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) {
      await removeWorkspace(workspace.teamId);
      await changed();
    }
  }

  const addAction = (
    <Action.Push
      title="Add Workspace"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<AddWorkspaceForm onAdded={changed} />}
    />
  );

  return (
    <List
      isLoading={workspaces === undefined}
      navigationTitle="Manage Workspaces"
      searchBarPlaceholder="Search workspaces…"
    >
      <List.EmptyView
        icon={Icon.PlusCircle}
        title="No Workspaces Yet"
        description="Press Return to connect your first Slack workspace."
        actions={<ActionPanel>{addAction}</ActionPanel>}
      />
      {workspaces?.map((workspace) => (
        <List.Item
          key={workspace.teamId}
          icon={Icon.TwoPeople}
          title={workspace.name}
          accessories={[{ text: workspace.user }]}
          actions={
            <ActionPanel>
              {addAction}
              <Action
                title="Remove Workspace"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => remove(workspace)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

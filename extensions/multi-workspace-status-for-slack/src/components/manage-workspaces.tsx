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
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useState } from "react";
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
          <Action title="Copy Manifest and Open Slack" icon={Icon.Globe} onAction={openSlack} />
        </ActionPanel>
      }
    >
      <Form.Description title="Step 1" text="Press ⌘⇧↩ to copy the app manifest and open Slack." />
      <Form.Description
        title="Step 2"
        text="Select “From a manifest”, choose your workspace, and paste the manifest as JSON."
      />
      <Form.Description title="Step 3" text="Under “OAuth & Permissions”, click “Install to Workspace”." />
      <Form.Description title="Step 4" text="Paste the “User OAuth Token” below." />
      <Form.PasswordField id="token" title="User OAuth Token" placeholder="xoxp-…" />
    </Form>
  );
}

export default function ManageWorkspaces({ onChange }: { onChange: () => Promise<unknown> }) {
  const {
    data: workspaces,
    isLoading,
    error,
    revalidate,
  } = usePromise(loadWorkspaces, [], {
    failureToastOptions: { title: "Could not load workspaces" },
  });

  async function changed() {
    await revalidate();
    await onChange();
  }

  async function remove(workspace: Workspace) {
    const confirmed = await confirmAlert({
      title: `Remove ${workspace.name}?`,
      message: "This deletes the token from Raycast. The app stays installed in Slack.",
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) {
      try {
        await removeWorkspace(workspace.teamId);
        await changed();
      } catch (error) {
        await showFailureToast(error, { title: `Could not remove ${workspace.name}` });
      }
    }
  }

  const addAction = (
    <Action.Push title="Add Workspace" icon={Icon.Plus} target={<AddWorkspaceForm onAdded={changed} />} />
  );

  if (error && !workspaces) {
    return (
      <List navigationTitle="Manage Workspaces">
        <List.EmptyView icon={Icon.Warning} title="Could Not Load Workspaces" description={error.message} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle="Manage Workspaces" searchBarPlaceholder="Search workspaces…">
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
                onAction={() => remove(workspace)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

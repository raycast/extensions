import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { listWorkspaces, renameWorkspace, Workspace } from "./cmux";

export default function Command() {
  const { data, isLoading, revalidate } = useCachedPromise(listWorkspaces, [], {
    onError: (error) => {
      void showFailureToast(error, { title: "Failed to load workspaces" });
    },
  });
  const { push } = useNavigation();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Pick a workspace to rename…">
      {(data ?? []).map((ws) => (
        <List.Item
          key={ws.ref}
          title={ws.title}
          subtitle={ws.currentDirectory ?? undefined}
          icon={ws.selected ? Icon.CheckCircle : Icon.Circle}
          accessories={[{ text: ws.ref }]}
          actions={
            <ActionPanel>
              <Action
                title="Rename Workspace"
                icon={Icon.Pencil}
                onAction={() => push(<RenameForm workspace={ws} onRenamed={revalidate} />)}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView
        title="No workspaces"
        description="Create one with the New Workspace command."
      />
    </List>
  );
}

function RenameForm({ workspace, onRenamed }: { workspace: Workspace; onRenamed: () => void }) {
  const { pop } = useNavigation();
  const [error, setError] = useState<string | undefined>();

  async function handleSubmit(values: { title: string }) {
    const title = values.title?.trim();
    if (!title) {
      setError("Name is required");
      return;
    }
    const toast = await showToast({ style: Toast.Style.Animated, title: "Renaming…" });
    try {
      await renameWorkspace(workspace.ref, title);
      toast.style = Toast.Style.Success;
      toast.title = `Renamed to "${title}"`;
      onRenamed();
      pop();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to rename workspace";
      toast.message = e instanceof Error ? e.message : String(e);
    }
  }

  return (
    <Form
      navigationTitle={`Rename ${workspace.title}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename" icon={Icon.Pencil} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="New Name"
        defaultValue={workspace.title}
        autoFocus
        error={error}
        onChange={() => error && setError(undefined)}
      />
      <Form.Description text={`Workspace ${workspace.ref}`} />
    </Form>
  );
}

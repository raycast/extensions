import { Action, ActionPanel, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { API_HEADERS, API_URL, useTallyPaginated } from "./tally";
import { Workspace } from "./interfaces";
import OpenInTally from "./open-in-tally";
import { FormValidation, useForm } from "@raycast/utils";

export default function Workspaces() {
  const { isLoading, data: workspaces, revalidate } = useTallyPaginated<Workspace>("workspaces");
  return (
    <List isLoading={isLoading}>
      {workspaces.map((workspace) => (
        <List.Item
          key={workspace.id}
          icon={Icon.Folder}
          title={workspace.name || "My workspace"}
          accessories={[
            { icon: Icon.TwoPeople, text: `${workspace.members.length} members` },
            { icon: Icon.Envelope, text: `${workspace.invites.length} invites` },
          ]}
          actions={
            <ActionPanel>
              <OpenInTally route={`workspaces/${workspace.id}`} />
              <Action.Push
                icon={Icon.Pencil}
                title="Update Workspace"
                target={<RenameWorkspace workspace={workspace} onRename={revalidate} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function RenameWorkspace({ workspace, onRename }: { workspace: Workspace; onRename: () => void }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ name: string }>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Renaming");
      try {
        const response = await fetch(API_URL + `workspaces/${workspace.id}`, {
          method: "PATCH",
          headers: API_HEADERS,
          body: JSON.stringify(values),
        });
        if (!response.ok) {
          const err = (await response.json()) as { message: string };
          throw new Error(err.message);
        }
        toast.style = Toast.Style.Success;
        toast.title = "Renamed";
        toast.message = `"${workspace.name}" -> "${values.name}"`;
        onRename();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not rename";
        toast.message = `${error}`;
      }
    },
    initialValues: {
      name: workspace.name || "My workspace",
    },
    validation: {
      name: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Complete" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Workspace name" placeholder="My workspace" {...itemProps.name} />
    </Form>
  );
}

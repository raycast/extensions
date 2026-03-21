import {
  List,
  Icon,
  ActionPanel,
  Action,
  Form,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
  Alert,
  confirmAlert,
} from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { Org, WorkspaceWithDocsAndDomain, WorkspaceParameters } from "grist-js";
import { grist } from "./grist";
import OpenInGrist from "./open-in-grist";
import Documents from "./documents";

export default function Workspaces({ organization }: { organization: Org }) {
  const {
    isLoading,
    data: workspaces,
    mutate,
  } = useCachedPromise(
    async (orgId: string | number) => {
      const res = await grist.listWorkspaces({
        orgId,
      });
      return res;
    },
    [organization.id],
    { initialData: [] },
  );

  const confirmAndDelete = async (workspace: WorkspaceWithDocsAndDomain) => {
    const options: Alert.Options = {
      title: `Delete ${workspace.name} and all included documents?`,
      message: "Workspace will be moved to Trash.",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Delete",
      },
    };
    if (!(await confirmAlert(options))) return;
    const toast = await showToast(Toast.Style.Animated, "Deleting", workspace.name);
    try {
      await mutate(
        grist.deleteWorkspace({
          workspaceId: workspace.id,
        }),
        {
          optimisticUpdate(data) {
            return data.filter((w) => w.id !== workspace.id);
          },
          shouldRevalidateAfter: false,
        },
      );
      toast.style = Toast.Style.Success;
      toast.title = "Deleted";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = `${error}`;
    }
  };

  return (
    <List isLoading={isLoading} navigationTitle={`Search Organizations / ${organization.name} / Workspaces`}>
      {workspaces.map((workspace) => (
        <List.Item
          key={workspace.id}
          icon={Icon.AppWindow}
          title={workspace.name}
          subtitle={workspace.orgDomain}
          accessories={[{ tag: workspace.access }, { icon: Icon.Document, text: workspace.docs.length.toString() }]}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Document} title="Documents" target={<Documents workspace={workspace} />} />
              {workspace.access !== "viewers" && (
                <>
                  <Action.Push
                    icon={Icon.Plus}
                    title="Create Workspace"
                    target={<CreateWorkspace organization={organization} />}
                    onPop={mutate}
                  />
                  <Action
                    icon={Icon.Trash}
                    title="Delete Workspace"
                    onAction={() => confirmAndDelete(workspace)}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                  />
                </>
              )}
              <OpenInGrist route={`ws/${workspace.id}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
function CreateWorkspace({ organization }: { organization: Org }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<WorkspaceParameters>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating", values.name);
      try {
        const res = await grist.createWorkspace({
          orgId: organization.id,
          requestBody: {
            name: values.name,
          },
        });
        toast.style = Toast.Style.Success;
        toast.title = "Created";
        toast.message = res.toString();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    validation: {
      name: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create Workspace" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Enter name" {...itemProps.name} />
    </Form>
  );
}

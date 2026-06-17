import { ActionPanel, Action, Icon, List, Form, showToast, Toast, popToRoot, Alert, confirmAlert } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { Environment, ErrorResult, type ModernProject } from "./interfaces";
import { useToken } from "./instances";
import Services from "./services";
import { getTotalServices } from "./utils";

export default function Environments({ project }: { project: ModernProject }) {
  const { url, headers } = useToken();

  async function deleteEnvironment(environment: Environment) {
    if (getTotalServices(environment) > 0) {
      await showToast(Toast.Style.Failure, "Unable to delete", "Please delete all services first");
      return;
    }

    const options: Alert.Options = {
      title: "Are you sure to delete this environment?",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Delete",
      },
    };
    if (await confirmAlert(options)) {
      const toast = await showToast(Toast.Style.Animated, "Deleting environment", environment.name);
      try {
        const response = await fetch(url + "environment.remove", {
          method: "POST",
          headers,
          body: JSON.stringify({ environmentId: environment.environmentId }),
        });
        if (!response.ok) {
          const err = (await response.json()) as ErrorResult;
          throw new Error(err.message);
        }
        toast.style = Toast.Style.Success;
        toast.title = "Deleted environment";
        await popToRoot();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not delete environment";
        toast.message = `${error}`;
      }
    }
  }

  return (
    <List navigationTitle="Environments">
      {project.environments.map((environment) => (
        <List.Item
          key={environment.environmentId}
          icon={Icon.Book}
          title={environment.name}
          subtitle={`${getTotalServices(environment)} services`}
          accessories={[{ date: new Date(environment.createdAt) }]}
          actions={
            <ActionPanel>
              <Action.Push icon="folder-input.svg" title="Services" target={<Services environment={environment} />} />
              <Action.Push
                icon={Icon.Plus}
                title="Create Environment"
                target={<CreateEnvironment project={project} />}
              />
              <Action
                icon={Icon.Trash}
                title="Delete"
                style={Action.Style.Destructive}
                onAction={() => deleteEnvironment(environment)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function CreateEnvironment({ project }: { project: ModernProject }) {
  const { url, headers } = useToken();

  interface FormValues {
    name: string;
    description: string;
  }

  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating Environment", values.name);
      try {
        const response = await fetch(url + "environment.create", {
          method: "POST",
          headers,
          body: JSON.stringify({ ...values, projectId: project.projectId }),
        });
        if (!response.ok) {
          const err = (await response.json()) as ErrorResult;
          throw new Error(err.message);
        }
        toast.style = Toast.Style.Success;
        toast.title = "Created Environment";
        await popToRoot();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not create Environment";
        toast.message = `${error}`;
      }
    },
    validation: {
      name: FormValidation.Required,
    },
  });
  return (
    <Form
      navigationTitle="Environments"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Production" {...itemProps.name} />
      <Form.TextArea title="Description" placeholder="Description about your environment" {...itemProps.description} />
    </Form>
  );
}

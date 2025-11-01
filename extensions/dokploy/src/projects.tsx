import { ActionPanel, Action, Icon, List, Form, showToast, Toast, Alert, confirmAlert, popToRoot } from "@raycast/api";
import { FormValidation, showFailureToast, useFetch, useForm } from "@raycast/utils";
import { ErrorResult, Project } from "./interfaces";
import { useToken } from "./instances";
import Services from "./services";

export function getProjectTotalServices(project: Project) {
  return (
    project.applications.length +
    project.mariadb.length +
    project.mongo.length +
    project.mysql.length +
    project.postgres.length +
    project.redis.length +
    project.compose.length
  );
}
export default function Projects() {
  const { url, headers } = useToken();

  const { isLoading, data: projects } = useFetch<Project[], Project[]>(url + "project.all", {
    headers,
    initialData: [],
  });

  async function deleteProject(project: Project) {
    if (getProjectTotalServices(project)) {
      await showFailureToast("You have active services, please delete them first", { title: "Unable to delete" });
      return;
    }

    const options: Alert.Options = {
      title: "Are you sure to delete this project?",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Delete",
      },
    };
    if (await confirmAlert(options)) {
      const toast = await showToast(Toast.Style.Animated, "Deleting project", project.name);
      try {
        const response = await fetch(url + "project.remove", {
          method: "POST",
          headers,
          body: JSON.stringify({ projectId: project.projectId }),
        });
        if (!response.ok) {
          const err = (await response.json()) as ErrorResult;
          throw new Error(err.message);
        }
        toast.style = Toast.Style.Success;
        toast.title = "Deleted project";
        await popToRoot();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not delete project";
        toast.message = `${error}`;
      }
    }
  }

  return (
    <List navigationTitle="Projects" isLoading={isLoading}>
      {!isLoading && !projects.length ? (
        <List.EmptyView
          icon="folder-input.svg"
          title="No projects found"
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="Create Project" target={<CreateService />} />
            </ActionPanel>
          }
        />
      ) : (
        projects.map((project) => (
          <List.Item
            key={project.projectId}
            icon={Icon.Book}
            title={project.name}
            subtitle={`${getProjectTotalServices(project)} services`}
            accessories={[{ date: new Date(project.createdAt) }]}
            actions={
              <ActionPanel>
                <Action.Push icon="folder-input.svg" title="Services" target={<Services project={project} />} />
                <Action.Push icon={Icon.Plus} title="Create Project" target={<CreateService />} />
                <Action
                  icon={Icon.Trash}
                  title="Delete"
                  style={Action.Style.Destructive}
                  onAction={() => deleteProject(project)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function CreateService() {
  const { url, headers } = useToken();

  interface FormValues {
    name: string;
    description: string;
  }

  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating Project", values.name);
      try {
        const response = await fetch(url + "project.create", {
          method: "POST",
          headers,
          body: JSON.stringify(values),
        });
        if (!response.ok) {
          const err = (await response.json()) as ErrorResult;
          throw new Error(err.message);
        }
        toast.style = Toast.Style.Success;
        toast.title = "Created Project";
        await popToRoot();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not create Project";
        toast.message = `${error}`;
      }
    },
    validation: {
      name: FormValidation.Required,
    },
  });
  return (
    <Form
      navigationTitle="Projects"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Vandelay Industries" {...itemProps.name} />
      <Form.TextArea title="Description" placeholder="Description about your project" {...itemProps.description} />
    </Form>
  );
}

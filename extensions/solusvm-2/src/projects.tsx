import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, getAvatarIcon, MutatePromise, showFailureToast, useFetch, useForm } from "@raycast/utils";
import { API_HEADERS, callApi, generateApiUrl } from "./api";
import Servers from "./components/servers";
import { Project } from "./types";
import Members from "./components/members";

export default function Projects() {
  const {
    isLoading,
    data: projects,
    mutate,
  } = useFetch(generateApiUrl("projects"), {
    headers: API_HEADERS,
    mapResult(result: { data: Project[] }) {
      return {
        data: result.data,
      };
    },
    initialData: [],
  });

  async function confirmAndDelete(project: Project) {
    if (project.is_default) {
      await showFailureToast("Default project can't be deleted");
      return;
    }
    const options: Alert.Options = {
      title: "Delete Project",
      message: "Do you really want to delete this project?",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Yes, delete",
      },
    };
    if (await confirmAlert(options)) {
      const toast = await showToast(Toast.Style.Animated, "Deleting project", project.name);
      try {
        await mutate(callApi(`projects/${project.id}`, { method: "DELETE" }), {
          optimisticUpdate(data) {
            return data.filter((p) => p.id !== project.id);
          },
          shouldRevalidateAfter: false,
        });
        toast.style = Toast.Style.Success;
        toast.title = "Deleted project";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not delete project";
        toast.message = `${error}`;
      }
    }
  }

  return (
    <List isLoading={isLoading}>
      {projects.map((project) => (
        <List.Item
          key={project.id}
          icon={getAvatarIcon(project.name)}
          title={project.name}
          subtitle={project.description}
          accessories={[
            { icon: { source: "resource.svg", tintColor: Color.PrimaryText }, text: `${project.servers} servers` },
            { icon: { source: "user.svg", tintColor: Color.PrimaryText }, text: `${project.members} members` },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                icon={{ source: "resource.svg", tintColor: Color.PrimaryText }}
                title="View Servers"
                target={<Servers project={project} />}
              />
              <Action.Push
                icon={{ source: "user.svg", tintColor: Color.PrimaryText }}
                title="View Members"
                target={<Members project={project} />}
              />
              <Action.Push
                icon={Icon.Pencil}
                title="Update"
                target={<UpdateProject project={project} mutate={mutate} />}
                shortcut={Keyboard.Shortcut.Common.Edit}
              />
              <Action
                icon={Icon.Trash}
                title="Delete"
                onAction={() => confirmAndDelete(project)}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function UpdateProject({ project, mutate }: { project: Project; mutate: MutatePromise<Project[]> }) {
  const { pop } = useNavigation();
  type FormValues = {
    name: string;
    description: string;
  };
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Updating project", project.id.toString());
      try {
        await mutate(
          callApi(`projects/${project.id}`, {
            method: "PUT",
            body: values,
          }),
        );
        toast.style = Toast.Style.Success;
        toast.title = "Updated project";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not update project";
        toast.message = `${error}`;
      }
    },
    initialValues: {
      name: project.name,
      description: project.description,
    },
    validation: {
      name: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="ID" text={project.id.toString()} />
      <Form.TextField title="Name" placeholder="Name" {...itemProps.name} />
      <Form.TextField title="Description" placeholder="Description" {...itemProps.description} />
    </Form>
  );
}

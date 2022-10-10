import { ActionPanel, Action, Toast, Form, Icon, showToast, open, useNavigation } from "@raycast/api";
import { FormValidation, MutatePromise, useCachedPromise, useForm } from "@raycast/utils";
import { AddProjectArgs, colors, Project as TProject } from "@doist/todoist-api-typescript";
import { handleError, todoist } from "../api";
import { isTodoistInstalled } from "../helpers/isTodoistInstalled";
import View from "./View";
import Project from "./Project";

interface ProjectFormProps {
  project?: TProject;
  mutate?: MutatePromise<TProject[] | undefined>;
}

type ProjectFormValues = {
  name: string;
  favorite: boolean;
  colorId: string;
  parentId: string;
};

export default function ProjectForm({ project, mutate }: ProjectFormProps) {
  const { push, pop } = useNavigation();

  const { data, error, isLoading } = useCachedPromise(() => todoist.getProjects());

  if (error) {
    handleError({ error, title: "Unable to get projects" });
  }

  const isCreatingProject = !project;

  const projects = data?.filter((project) => !project.inboxProject);

  const initialValues = {
    name: project ? project.name : "",
    parentId: "",
    favorite: project ? project.favorite : false,
    colorId: project ? String(project.color) : "",
  };

  const { handleSubmit, itemProps, focus, reset } = useForm<ProjectFormValues>({
    async onSubmit({ name, favorite, colorId, parentId }) {
      async function create() {
        const body: AddProjectArgs = { name, favorite };

        if (!body.name) {
          await showToast({ style: Toast.Style.Failure, title: "The project's name is required" });
          return;
        }

        if (parentId) {
          body.parentId = parseInt(parentId);
        }

        if (colorId) {
          body.color = parseInt(colorId);
        }

        const toast = new Toast({ style: Toast.Style.Animated, title: "Creating project" });
        await toast.show();

        try {
          const { url, id } = await todoist.addProject(body);
          toast.style = Toast.Style.Success;
          toast.title = "Project created";
          toast.primaryAction = {
            title: "Open Project",
            shortcut: { modifiers: ["cmd"], key: "o" },
            onAction: () => push(<Project projectId={id} />),
          };
          toast.secondaryAction = {
            title: `Open Project ${isTodoistInstalled ? "in Todoist" : "in Browser"}`,
            shortcut: { modifiers: ["cmd", "shift"], key: "o" },
            onAction: async () => {
              open(isTodoistInstalled ? `todoist://project?id=${id}` : url);
            },
          };

          reset(initialValues);
          focus("name");
        } catch (error) {
          console.error(error);
          handleError({ error, title: "Unable to create project" });
        }
      }

      async function update() {
        if (!project) {
          return;
        }

        const body: AddProjectArgs = { name, favorite };

        if (!body.name) {
          await showToast({ style: Toast.Style.Failure, title: "The project's name is required" });
          return;
        }

        if (colorId) {
          body.color = parseInt(colorId);
        }

        await showToast({ style: Toast.Style.Animated, title: "Updating project" });

        try {
          await todoist.updateProject(project.id, body);
          await showToast({ style: Toast.Style.Success, title: "Project updated" });
          if (mutate) {
            mutate();
          }
          pop();
        } catch (error) {
          handleError({ error, title: "Unable to create project" });
        }
      }

      return isCreatingProject ? create() : update();
    },
    initialValues,
    validation: {
      name: FormValidation.Required,
    },
  });

  return (
    <View>
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title={isCreatingProject ? "Create Project" : "Edit Project"}
              icon={isCreatingProject ? Icon.Plus : Icon.Pencil}
              onSubmit={handleSubmit}
            />
          </ActionPanel>
        }
        isLoading={isLoading}
      >
        <Form.TextField {...itemProps.name} title="Name" placeholder="My project" />

        <Form.Dropdown {...itemProps.colorId} title="Color">
          {colors.map(({ name, id, value }) => (
            <Form.Dropdown.Item
              value={String(id)}
              title={name}
              key={id}
              icon={{ source: Icon.Dot, tintColor: value }}
            />
          ))}
        </Form.Dropdown>

        {isCreatingProject && projects && projects.length > 0 ? (
          <Form.Dropdown {...itemProps.parentId} title="Parent project">
            <Form.Dropdown.Item value="" title="None" />
            {projects.map(({ id, name }) => (
              <Form.Dropdown.Item value={String(id)} title={name} key={id} />
            ))}
          </Form.Dropdown>
        ) : null}

        <Form.Checkbox {...itemProps.favorite} label="Mark as favorite?" />
      </Form>
    </View>
  );
}

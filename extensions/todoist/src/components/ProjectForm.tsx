import { ActionPanel, Action, Toast, Form, Icon, showToast, open, useNavigation } from "@raycast/api";
import { FormValidation, MutatePromise, useCachedPromise, useForm } from "@raycast/utils";
import { AddProjectArgs, colors, Project as TProject, ProjectViewStyle } from "@doist/todoist-api-typescript";
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
  isFavorite: boolean;
  color: string;
  parentId: string;
  viewStyle: string;
};

export default function ProjectForm({ project, mutate }: ProjectFormProps) {
  const { push, pop } = useNavigation();

  const { data, error, isLoading } = useCachedPromise(() => todoist.getProjects());

  if (error) {
    handleError({ error, title: "Unable to get projects" });
  }

  const isCreatingProject = !project;

  const projects = data?.filter((project) => !project.isInboxProject);

  const initialValues = {
    name: project ? project.name : "",
    parentId: "",
    isFavorite: project ? project.isFavorite : false,
    color: project ? project.color : "",
    viewStyle: project ? project.viewStyle : "list",
  };

  const { handleSubmit, itemProps, focus, reset } = useForm<ProjectFormValues>({
    async onSubmit({ name, isFavorite, color, parentId, viewStyle }) {
      async function create() {
        const body: AddProjectArgs = { name, isFavorite };

        if (!body.name) {
          await showToast({ style: Toast.Style.Failure, title: "The project's name is required" });
          return;
        }

        if (parentId) {
          body.parentId = parentId;
        }

        if (color) {
          body.color = color;
        }

        if (viewStyle) {
          body.viewStyle = viewStyle as ProjectViewStyle;
        }

        const toast = new Toast({ style: Toast.Style.Animated, title: "Creating project" });
        await toast.show();

        try {
          const project = await todoist.addProject(body);
          toast.style = Toast.Style.Success;
          toast.title = "Project created";
          toast.primaryAction = {
            title: "Open Project",
            shortcut: { modifiers: ["cmd"], key: "o" },
            onAction: () => push(<Project project={project} />),
          };
          toast.secondaryAction = {
            title: `Open Project ${isTodoistInstalled ? "in Todoist" : "in Browser"}`,
            shortcut: { modifiers: ["cmd", "shift"], key: "o" },
            onAction: async () => {
              open(isTodoistInstalled ? `todoist://project?id=${project.id}` : project.url);
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

        const body: AddProjectArgs = { name, isFavorite };

        if (!body.name) {
          await showToast({ style: Toast.Style.Failure, title: "The project's name is required" });
          return;
        }

        if (color) {
          body.color = color;
        }

        if (viewStyle) {
          body.viewStyle = viewStyle as ProjectViewStyle;
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
          handleError({ error, title: "Unable to update project" });
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

        <Form.Dropdown {...itemProps.color} title="Color">
          {colors.map(({ key, displayName, hexValue }) => (
            <Form.Dropdown.Item
              value={key}
              title={displayName}
              key={key}
              icon={{ source: Icon.CircleFilled, tintColor: hexValue }}
            />
          ))}
        </Form.Dropdown>

        {isCreatingProject && projects && projects.length > 0 ? (
          <Form.Dropdown {...itemProps.parentId} title="Parent project">
            <Form.Dropdown.Item value="" title="None" />
            {projects.map(({ id, name }) => (
              <Form.Dropdown.Item value={id} title={name} key={id} />
            ))}
          </Form.Dropdown>
        ) : null}

        <Form.Checkbox {...itemProps.isFavorite} label="Mark as favorite?" />

        <Form.Dropdown {...itemProps.viewStyle} title="View Style">
          <Form.Dropdown.Item value="list" title="List" icon={Icon.List} />

          <Form.Dropdown.Item value="board" title="Board" icon={Icon.BarChart} />
        </Form.Dropdown>
      </Form>
    </View>
  );
}

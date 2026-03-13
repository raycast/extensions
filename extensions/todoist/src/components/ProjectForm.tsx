import { ActionPanel, Action, Toast, Form, Icon, showToast, open, useNavigation } from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";

import {
  AddProjectArgs,
  UpdateProjectArgs,
  ProjectViewStyle,
  Project as TProject,
  updateProject,
  addProject,
} from "../api";
import { colors } from "../helpers/colors";
import { getProjectAppUrl, getProjectIcon, getProjectUrl } from "../helpers/projects";
import { isTodoistInstalled } from "../hooks/useIsTodoistInstalled";
import useSyncData from "../hooks/useSyncData";

import Project from "./Project";
import RefreshAction from "./RefreshAction";

type ProjectFormProps = {
  project?: TProject;
  fromProjectList?: boolean;
};

type ProjectFormValues = {
  name: string;
  isFavorite: boolean;
  color: string;
  parentId: string;
  viewStyle: string;
};

export default function ProjectForm({ project, fromProjectList }: ProjectFormProps) {
  const { push, pop } = useNavigation();

  const { data, setData, isLoading } = useSyncData();

  const isCreatingProject = !project;

  const projects = data?.projects.filter((p) => !p.inbox_project);

  const initialValues = {
    name: project ? project.name : "",
    parentId: "",
    isFavorite: project ? project.is_favorite : false,
    color: project ? project.color : "",
    viewStyle: project ? project.view_style : "list",
  };

  const { handleSubmit, itemProps, focus, reset } = useForm<ProjectFormValues>({
    async onSubmit({ name, isFavorite, color, parentId, viewStyle }) {
      async function create() {
        const body: AddProjectArgs = { name, is_favorite: isFavorite };

        if (parentId) {
          body.parent_id = parentId;
        }

        if (color) {
          body.color = color;
        }

        if (viewStyle) {
          body.view_style = viewStyle as ProjectViewStyle;
        }

        const toast = new Toast({ style: Toast.Style.Animated, title: "Creating project" });
        await toast.show();

        try {
          const projectId = await addProject(body, { data, setData });

          toast.style = Toast.Style.Success;
          toast.title = "Project created";

          if (projectId) {
            toast.primaryAction = {
              title: "Open Project",
              shortcut: { modifiers: ["cmd"], key: "o" },
              onAction: () => push(<Project projectId={projectId} />),
            };

            toast.secondaryAction = {
              title: `Open Project`,
              shortcut: { modifiers: ["cmd", "shift"], key: "o" },
              onAction: async () => {
                const isInstalled = await isTodoistInstalled();
                open(isInstalled ? getProjectAppUrl(projectId) : getProjectUrl(projectId));
              },
            };
          }

          reset(initialValues);
          focus("name");

          if (fromProjectList) {
            pop();
          }
        } catch (error) {
          await showFailureToast(error, { title: "Unable to create project" });
        }
      }

      async function update() {
        if (!project) {
          return;
        }

        const body: UpdateProjectArgs = { id: project.id, name, is_favorite: isFavorite };

        if (color) {
          body.color = color;
        }

        if (viewStyle) {
          body.view_style = viewStyle as ProjectViewStyle;
        }

        await showToast({ style: Toast.Style.Animated, title: "Updating project" });

        try {
          await updateProject(body, { data, setData });

          await showToast({ style: Toast.Style.Success, title: "Project updated" });
          pop();
        } catch (error) {
          await showFailureToast(error, { title: "Unable to update project" });
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
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isCreatingProject ? "Create Project" : "Edit Project"}
            icon={isCreatingProject ? Icon.Plus : Icon.Pencil}
            onSubmit={handleSubmit}
          />

          <RefreshAction />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.TextField {...itemProps.name} title="Name" placeholder="My project" />

      <Form.Dropdown {...itemProps.color} title="Color">
        {colors.map(({ key, name, value }) => (
          <Form.Dropdown.Item
            value={key}
            title={name}
            key={key}
            icon={{ source: Icon.CircleFilled, tintColor: value }}
          />
        ))}
      </Form.Dropdown>

      {isCreatingProject && projects && projects.length > 0 ? (
        <Form.Dropdown {...itemProps.parentId} title="Parent project">
          <Form.Dropdown.Item value="" title="None" />
          {projects.map((project) => (
            <Form.Dropdown.Item
              key={project.id}
              icon={getProjectIcon(project)}
              value={project.id}
              title={project.name}
            />
          ))}
        </Form.Dropdown>
      ) : null}

      <Form.Checkbox {...itemProps.isFavorite} label="Mark as favorite?" />

      <Form.Dropdown {...itemProps.viewStyle} title="View Style">
        <Form.Dropdown.Item value="list" title="List" icon={Icon.List} />

        <Form.Dropdown.Item value="board" title="Board" icon={Icon.BarChart} />
      </Form.Dropdown>
    </Form>
  );
}

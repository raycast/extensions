import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  useNavigation,
  Color,
  LocalStorage,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useState, useEffect } from "react";

interface Project {
  title: string;
  description?: string;
  status?: string;
  website?: string;
  backend?: string;
  repo?: string;
  roadmap?: string;
  design?: string;
  other?: string;
  favorite?: string;
}

const projectStatus = [
  { title: "Backlog", source: Icon.Circle, tintColor: Color.PrimaryText },
  { title: "In Progress", source: Icon.CircleProgress25, tintColor: Color.Yellow },
  { title: "Paused", source: Icon.CircleProgress50, tintColor: Color.Orange },
  { title: "In Review", source: Icon.CircleProgress75, tintColor: Color.Blue },
  { title: "Completed", source: Icon.CircleProgress100, tintColor: Color.Green },
  { title: "Maintenance", source: Icon.CircleEllipsis, tintColor: Color.Magenta },
  { title: "Blocked", source: Icon.Stop, tintColor: Color.Red },
];

const externalLink = [
  { id: "website", placeholder: "Live website url" },
  { id: "backend", placeholder: "shopify, sanity, wordpress, contentful..." },
  { id: "repo", placeholder: "Github, Gitlab, Bitbucket..." },
  { id: "roadmap", placeholder: "Jira, Linear, Notion, Monday..." },
  { id: "design", placeholder: "Figma, Sketch..." },
  { id: "other", placeholder: "Any other useful link" },
];

export default function Command() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    const fetchStoredProjects = async () => {
      const storedProjects = await LocalStorage.getItem<string>("projects");
      if (storedProjects) {
        setProjects(JSON.parse(storedProjects));
      }
    };
    fetchStoredProjects();
  }, []);

  useEffect(() => {
    LocalStorage.setItem("projects", JSON.stringify(projects));
  }, [projects]);

  function handleCreate(project: Project) {
    const newProjects = [...projects, project];
    setProjects(newProjects);
  }

  async function handleDelete(index: number) {
    const options: Alert.Options = {
      title: "Are you sure?",
      message: "This cannot be undone.",
      primaryAction: {
        title: "Delete Project",
        style: Alert.ActionStyle.Destructive,
      },
    };
    if (await confirmAlert(options)) {
      const newProjects = [...projects];
      newProjects.splice(index, 1);
      setProjects(newProjects);
    }
  }

  function handleEdit(index: number, editedProject: Project) {
    const updatedProjects = [...projects];
    updatedProjects[index] = editedProject;
    setProjects(updatedProjects);
  }

  const getStatusIcon = (status: string): { source: Icon; tintColor?: Color } => {
    const statusIcons: { [key: string]: { source: Icon; tintColor?: Color } } = {
      ...projectStatus.reduce(
        (icons, { title, source, tintColor }) => {
          icons[title] = { source, tintColor };
          return icons;
        },
        {} as { [key: string]: { source: Icon; tintColor?: Color } },
      ), // Add index signature
    };

    return statusIcons[status] || { source: Icon.Circle };
  };

  // List View
  return (
    <List
      isShowingDetail
      searchBarPlaceholder="Search projects by name or status"
      filtering={{ keepSectionOrder: true }}
      throttle
      actions={
        <ActionPanel>
          <CreateProjectAction onCreate={handleCreate} />
        </ActionPanel>
      }
    >
      {projects.map((project, index) => (
        <List.Item
          key={index}
          icon={getStatusIcon(project.status ?? "")}
          title={project.title}
          keywords={project.status ? [project.title, project.status] : [project.title]}
          detail={
            <List.Item.Detail
              markdown={project.description}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.TagList title="Status">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={project.status}
                      color={getStatusIcon(project.status ?? "").tintColor}
                    />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Separator />
                  {project.website ? (
                    <List.Item.Detail.Metadata.Link
                      title="Website"
                      target={project.website}
                      text={project.website.length > 32 ? project.website.substring(0, 32) + "..." : project.website}
                    />
                  ) : null}
                  {project.backend ? (
                    <List.Item.Detail.Metadata.Link
                      title="Backend"
                      target={project.backend}
                      text={project.backend.length > 32 ? project.backend.substring(0, 32) + "..." : project.backend}
                    />
                  ) : null}

                  {project.repo ? (
                    <List.Item.Detail.Metadata.Link
                      title="Repository"
                      target={project.repo || ""}
                      text={project.repo.length > 32 ? project.repo.substring(0, 32) + "..." : project.repo}
                    />
                  ) : null}

                  {project.roadmap ? (
                    <List.Item.Detail.Metadata.Link
                      title="Roadmap"
                      target={project.roadmap || ""}
                      text={project.roadmap.length > 32 ? project.roadmap.substring(0, 32) + "..." : project.roadmap}
                    />
                  ) : null}
                  {project.design ? (
                    <List.Item.Detail.Metadata.Link
                      title="Design Files"
                      target={project.design || ""}
                      text={project.design.length > 32 ? project.design.substring(0, 32) + "..." : project.design}
                    />
                  ) : null}
                  {project.other ? (
                    <List.Item.Detail.Metadata.Link
                      title="Other"
                      target={project.other || ""}
                      text={project.other.length > 32 ? project.other.substring(0, 32) + "..." : project.other}
                    />
                  ) : null}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              {project.favorite ? (
                <ActionPanel.Section>
                  <Action.OpenInBrowser
                    url={project[`${project.favorite}` as keyof Project] ?? ""}
                    title={`Open ${project.favorite} in Browser`}
                  />
                </ActionPanel.Section>
              ) : null}
              <ActionPanel.Section>
                <CreateProjectAction onCreate={handleCreate} />
                <EditProjectAction onEdit={handleEdit} project={project} index={index} />
                <DeleteProjectAction onDelete={() => handleDelete(index)} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function CreateProjectForm(props: { onCreate: (project: Project) => void }) {
  const { pop } = useNavigation();

  const submitForm = (values: {
    title: string;
    status: string;
    backend: string;
    description: string;
    website: string;
    repo: string;
    roadmap: string;
    design: string;
    favorite: string;
  }) => {
    props.onCreate({
      title: values.title,
      status: values.status,
      backend: values.backend,
      description: values.description,
      website: values.website,
      repo: values.repo,
      roadmap: values.roadmap,
      design: values.design,
      favorite: values.favorite,
    });
    pop();
  };

  const { handleSubmit, itemProps } = useForm({
    onSubmit: submitForm,
    validation: {
      title: FormValidation.Required,
    },
  });

  // Create View
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Project" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" placeholder="project name" {...itemProps.title} />
      <Form.TextArea
        id="description"
        title="Project Description"
        placeholder="project description (Markdown enabled)"
      />
      <Form.Dropdown id="status" title="Status" defaultValue={projectStatus[0].title}>
        {projectStatus.map((status, index) => (
          <Form.Dropdown.Item
            key={index}
            icon={{ source: status.source, tintColor: status.tintColor }}
            title={status.title}
            value={status.title}
          />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      {externalLink.map((link, index) => (
        <Form.TextField
          key={index}
          id={link.id}
          title={link.id.charAt(0).toUpperCase() + link.id.slice(1)}
          placeholder={link.placeholder}
        />
      ))}
      <Form.Dropdown id="favorite" title="Quick Open" defaultValue={externalLink[0].id}>
        {externalLink.map((link, index) => (
          <Form.Dropdown.Item key={index} title={link.id} value={link.id} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

function CreateProjectAction(props: { onCreate: (project: Project) => void }) {
  return (
    <Action.Push
      icon={Icon.Document}
      title="Create Project"
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<CreateProjectForm onCreate={props.onCreate} />}
    />
  );
}

function DeleteProjectAction(props: { onDelete: () => void }) {
  return (
    <Action
      icon={Icon.Trash}
      title="Delete Project"
      shortcut={{ modifiers: ["ctrl"], key: "delete" }}
      onAction={props.onDelete}
      style={Action.Style.Destructive}
    />
  );
}

function EditProjectForm(props: {
  onEdit: (index: number, project: Project) => void;
  project: Project;
  index: number;
}) {
  const { pop } = useNavigation();
  const [title, setTitle] = useState(props.project.title);

  const initialValues = { title };

  const submitForm = (values: {
    title: string;
    status: string;
    backend: string;
    description: string;
    website: string;
    repo: string;
    roadmap: string;
    design: string;
    other: string;
    favorite: string;
  }) => {
    props.onEdit(props.index, {
      title: values.title,
      status: values.status,
      backend: values.backend,
      description: values.description,
      website: values.website,
      repo: values.repo,
      roadmap: values.roadmap,
      design: values.design,
      other: values.other,
      favorite: values.favorite,
    });
    pop();
  };

  const { handleSubmit, itemProps } = useForm({
    onSubmit: submitForm,
    validation: {
      title: FormValidation.Required,
    },
    initialValues,
  });

  // Edit View
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Edit Project" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Title"
        placeholder="project name"
        value={title}
        onChange={(newValue) => setTitle(newValue)}
        {...itemProps.title}
      />

      <Form.Dropdown id="status" title="Status" defaultValue={props.project.status}>
        {projectStatus.map((status, index) => (
          <Form.Dropdown.Item
            key={index}
            icon={{ source: status.source, tintColor: status.tintColor }}
            title={status.title}
            value={status.title}
          />
        ))}
      </Form.Dropdown>

      <Form.TextArea
        id="description"
        title="Project Description"
        placeholder="project description (Markdown enabled)"
        defaultValue={props.project.description}
      />
      <Form.Separator />
      {externalLink.map((link, index) => (
        <Form.TextField
          key={index}
          id={link.id}
          title={link.id.charAt(0).toUpperCase() + link.id.slice(1)}
          placeholder={link.placeholder}
          defaultValue={props.project[link.id as keyof Project]}
        />
      ))}
      <Form.Dropdown id="favorite" title="Quick Open" defaultValue={props.project.favorite}>
        {externalLink.map((link, index) => (
          <Form.Dropdown.Item key={index} title={link.id} value={link.id} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

function EditProjectAction(props: {
  onEdit: (index: number, project: Project) => void;
  project: Project;
  index: number;
}) {
  return (
    <Action.Push
      icon={Icon.Pencil}
      title="Edit Project"
      shortcut={{ modifiers: ["ctrl"], key: "e" }}
      target={<EditProjectForm onEdit={props.onEdit} project={props.project} index={props.index} />}
    />
  );
}

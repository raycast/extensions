import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { randomUUID } from "node:crypto";
import { DefaultAction, Project, useActiveProjectId, useProjects } from "./store";

export default function ManageProjects() {
  const [projects, setProjects] = useProjects();
  const [activeId, setActiveId] = useActiveProjectId();
  const addAction = (
    <Action.Push
      title="Add Project"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<ProjectForm />}
    />
  );

  return (
    <List>
      <List.EmptyView
        title="No Projects"
        description="Add a project to browse its tokens"
        actions={<ActionPanel>{addAction}</ActionPanel>}
      />
      {projects.map((p) => (
        <List.Item
          key={p.id}
          title={p.name}
          subtitle={p.dirs.join(", ")}
          accessories={p.id === activeId ? [{ tag: "Active" }] : []}
          actions={
            <ActionPanel>
              <Action.Push title="Edit Project" icon={Icon.Pencil} target={<ProjectForm project={p} />} />
              <Action title="Set as Active Project" icon={Icon.Checkmark} onAction={() => setActiveId(p.id)} />
              {addAction}
              <Action
                title="Delete Project"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={async () => {
                  const ok = await confirmAlert({
                    title: `Delete "${p.name}"?`,
                    message: "Token files on disk are not touched.",
                    primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                  });
                  if (!ok) return;
                  await setProjects(projects.filter((x) => x.id !== p.id));
                  await LocalStorage.removeItem(`pins:${p.id}`);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

type FormValues = { name: string; dirs: string[]; templates: string; defaultAction: DefaultAction };

export function ProjectForm({ project }: { project?: Project }) {
  const { pop } = useNavigation();
  const [projects, setProjects] = useProjects();
  const [activeId, setActiveId] = useActiveProjectId();

  async function submit(values: FormValues) {
    if (!values.name.trim() || values.dirs.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Name and at least one directory are required" });
      return;
    }
    const next: Project = {
      id: project?.id ?? randomUUID(),
      name: values.name.trim(),
      dirs: values.dirs,
      templates: values.templates,
      defaultAction: values.defaultAction,
    };
    await setProjects(project ? projects.map((p) => (p.id === next.id ? next : p)) : [...projects, next]);
    if (!activeId) await setActiveId(next.id);
    pop();
  }

  return (
    <Form
      navigationTitle={project ? `Edit ${project.name}` : "Add Project"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Project" icon={Icon.Check} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="Design System" defaultValue={project?.name} />
      <Form.FilePicker
        id="dirs"
        title="Token Directories"
        info="Every .json and .json5 file inside these directories is read recursively."
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection
        defaultValue={project?.dirs}
      />
      <Form.TextArea
        id="templates"
        title="Copy Templates"
        placeholder={'var(--{kebab-name})\n@color design.color("{name}")'}
        info={
          "One template per line; each becomes a copy action on matching tokens. Start a line with @group.path to apply it only to that group, where {name} is relative to the group."
        }
        defaultValue={project?.templates}
      />
      <Form.Description title="Placeholders" text="{name}  {path}  {kebab-name}  {camel-name}  {snake-name}  {value}" />
      <Form.Dropdown
        id="defaultAction"
        title="Enter Copies"
        info="Template copies the most specific matching template; tokens without one fall back to the value."
        defaultValue={project?.defaultAction ?? "value"}
      >
        <Form.Dropdown.Item value="value" title="Value" />
        <Form.Dropdown.Item value="name" title="Name" />
        <Form.Dropdown.Item value="template" title="Template" />
      </Form.Dropdown>
    </Form>
  );
}

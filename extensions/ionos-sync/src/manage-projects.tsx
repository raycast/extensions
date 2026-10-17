import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  Form,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { loadProjects, upsertProject, deleteProject, newProjectId } from "./storage";
import { Project, DEFAULT_EXCLUDES } from "./types";

// ─── Project Form (Add / Edit) ────────────────────────────────────────────────

function ProjectForm({ existing, onSave }: { existing?: Project; onSave: (p: Project) => void }) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const [localError, setLocalError] = useState<string | undefined>();
  const [remoteError, setRemoteError] = useState<string | undefined>();

  function handleSubmit(values: {
    name: string;
    localPath: string;
    remotePath: string;
    excludes: string;
    deleteOnSync: boolean;
  }) {
    let valid = true;

    if (!values.name.trim()) {
      setNameError("Name is required");
      valid = false;
    }
    if (!values.localPath.trim()) {
      setLocalError("Local path is required");
      valid = false;
    }
    if (!values.remotePath.trim()) {
      setRemoteError("Remote path is required");
      valid = false;
    }
    if (!valid) return;

    const excludes = values.excludes
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const project: Project = {
      id: existing?.id ?? newProjectId(),
      name: values.name.trim(),
      localPath: values.localPath.trim(),
      remotePath: values.remotePath.trim(),
      excludes,
      deleteOnSync: values.deleteOnSync,
      lastSync: existing?.lastSync,
    };

    onSave(project);
    pop();
  }

  const defaultExcludes = (existing?.excludes ?? DEFAULT_EXCLUDES).join("\n");

  return (
    <Form
      navigationTitle={existing ? `Edit: ${existing.name}` : "New Project"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={existing ? "Save" : "Add Project"}
            icon={Icon.CheckCircle}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="my-project"
        defaultValue={existing?.name}
        error={nameError}
        onChange={() => setNameError(undefined)}
        info="Unique short name (shown in the list)"
      />
      <Form.TextField
        id="localPath"
        title="Local Path"
        placeholder="~/projects/my-project/dist"
        defaultValue={existing?.localPath}
        error={localError}
        onChange={() => setLocalError(undefined)}
        info="Absolute path or with ~/ — the contents of this folder will be synced"
      />
      <Form.TextField
        id="remotePath"
        title="Remote Path (IONOS)"
        placeholder="~/my-project"
        defaultValue={existing?.remotePath}
        error={remoteError}
        onChange={() => setRemoteError(undefined)}
        info="Path on the IONOS server. ~/ = SSH user home directory"
      />
      <Form.Separator />
      <Form.Checkbox
        id="deleteOnSync"
        label="Enable --delete (also delete remotely files deleted locally)"
        defaultValue={existing?.deleteOnSync ?? true}
        info="Disable for root sync (~/) — otherwise other projects may be deleted"
      />
      <Form.TextArea
        id="excludes"
        title="Excludes"
        placeholder={DEFAULT_EXCLUDES.join("\n")}
        defaultValue={defaultExcludes}
        info="One exclude rule per line. Wildcards allowed (e.g. wp-*)"
        enableMarkdown={false}
      />
    </Form>
  );
}

// ─── Main Command ─────────────────────────────────────────────────────────────

export default function Command() {
  const { push } = useNavigation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProjects()
      .then((p) => {
        setProjects(p);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
        void showToast({ style: Toast.Style.Failure, title: "Failed to load projects" });
      });
  }, []);

  async function handleSave(project: Project) {
    const updated = await upsertProject(project);
    setProjects(updated);
    void showToast({
      style: Toast.Style.Success,
      title: "Project saved",
      message: project.name,
    });
  }

  async function handleDelete(project: Project) {
    const confirmed = await confirmAlert({
      title: `Delete "${project.name}"?`,
      message: "The configuration will be removed. Files will not be deleted.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const updated = await deleteProject(project.id);
    setProjects(updated);
    void showToast({
      style: Toast.Style.Success,
      title: "Project deleted",
      message: project.name,
    });
  }

  function excludeSummary(p: Project): string {
    if (p.excludes.length === 0) return "No excludes";
    return `${p.excludes.length} excludes`;
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Manage Projects"
      actions={
        <ActionPanel>
          <Action
            title="Add Project"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={() => push(<ProjectForm onSave={handleSave} />)}
          />
        </ActionPanel>
      }
    >
      {projects.map((project) => (
        <List.Item
          key={project.id}
          icon={Icon.Globe}
          title={project.name}
          subtitle={`${project.localPath} → ${project.remotePath}`}
          accessories={[
            {
              tag: {
                value: excludeSummary(project),
                color: project.excludes.length > 0 ? Color.Blue : Color.SecondaryText,
              },
            },
            {
              tag: {
                value: project.deleteOnSync ? "--delete" : "no delete",
                color: project.deleteOnSync ? Color.Orange : Color.Green,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Edit"
                icon={Icon.Pencil}
                onAction={() => push(<ProjectForm existing={project} onSave={handleSave} />)}
              />
              <Action
                title="Add Project"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={() => push(<ProjectForm onSave={handleSave} />)}
              />
              <Action
                title="Delete"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                onAction={() => handleDelete(project)}
              />
            </ActionPanel>
          }
        />
      ))}

      {projects.length === 0 && !isLoading && (
        <List.EmptyView icon={Icon.Globe} title="No projects yet" description="Press ⌘N to add a project" />
      )}
    </List>
  );
}

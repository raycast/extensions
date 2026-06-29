import { List, Icon, ActionPanel, Action, showToast, Toast, Form, Color, confirmAlert, Alert } from "@raycast/api";
import { createProject, updateProject, deleteProject } from "./api/ticktick";
import { useSync } from "./hooks/useSync";
import { useAlerts } from "./hooks/useAlerts";
import { Project } from "./types/ticktick";

function CreateProjectForm({ onCreated }: { onCreated: () => void }) {
  return (
    <Form
      navigationTitle="New Project"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Project"
            onSubmit={async (values: { name: string; color: string }) => {
              if (!values.name.trim()) {
                await showToast({ style: Toast.Style.Failure, title: "Name is required" });
                return;
              }
              try {
                await createProject(values.name.trim(), values.color || "#4A90E2");
                await showToast({ style: Toast.Style.Success, title: "Project created" });
                onCreated();
              } catch (err) {
                await showToast({ style: Toast.Style.Failure, title: "Failed", message: String(err) });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="My Project" />
      <Form.TextField id="color" title="Color" defaultValue="#4A90E2" placeholder="#4A90E2" />
    </Form>
  );
}

export default function ManageProjects() {
  useAlerts();
  const { data, isLoading, revalidate } = useSync();
  const projects = data.projects.filter((p) => !p.closed && p.kind?.toUpperCase() !== "INBOX");

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Manage Projects"
      searchBarPlaceholder="Search projects..."
      actions={
        <ActionPanel>
          <Action.Push title="Create Project" icon={Icon.Plus} target={<CreateProjectForm onCreated={revalidate} />} />
        </ActionPanel>
      }
    >
      {projects.map((project: Project) => (
        <List.Item
          key={project.id}
          icon={{ source: Icon.List, tintColor: (project.color as Color) ?? Color.Blue }}
          title={project.name}
          subtitle={project.viewMode ?? "list"}
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Project"
                icon={Icon.Plus}
                target={<CreateProjectForm onCreated={revalidate} />}
              />
              <Action
                title="Rename Project"
                icon={Icon.Pencil}
                onAction={async () => {
                  const { Clipboard } = await import("@raycast/api");
                  const newName = await Clipboard.readText();
                  if (!newName) {
                    await showToast({ style: Toast.Style.Failure, title: "Copy new name to clipboard first" });
                    return;
                  }
                  try {
                    await updateProject(project.id, { name: newName });
                    await showToast({ style: Toast.Style.Success, title: "Project renamed" });
                    revalidate();
                  } catch (err) {
                    await showToast({ style: Toast.Style.Failure, title: "Failed", message: String(err) });
                  }
                }}
              />
              <Action
                title="Archive Project"
                icon={Icon.Tray}
                style={Action.Style.Destructive}
                onAction={async () => {
                  const confirmed = await confirmAlert({
                    title: `Archive "${project.name}"?`,
                    icon: Icon.Tray,
                    primaryAction: { title: "Archive", style: Alert.ActionStyle.Destructive },
                  });
                  if (!confirmed) return;
                  try {
                    await updateProject(project.id, { closed: true });
                    await showToast({ style: Toast.Style.Success, title: "Project archived" });
                    revalidate();
                  } catch (err) {
                    await showToast({ style: Toast.Style.Failure, title: "Failed", message: String(err) });
                  }
                }}
              />
              <Action
                title="Delete Project"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={async () => {
                  const confirmed = await confirmAlert({
                    title: `Delete "${project.name}"?`,
                    message: "This cannot be undone.",
                    icon: Icon.Trash,
                    primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                  });
                  if (!confirmed) return;
                  try {
                    await deleteProject(project.id);
                    await showToast({ style: Toast.Style.Success, title: "Project deleted" });
                    revalidate();
                  } catch (err) {
                    await showToast({ style: Toast.Style.Failure, title: "Failed", message: String(err) });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { useCompany, useMyProjects } from "./services/harvest";
import { find } from "es-toolkit/compat";
import { groupBy } from "es-toolkit";
import { Favorite } from "./listFavorites";

export function AddFavoriteAction({ onSave }: { onSave: (favorite: Favorite) => Promise<void> }) {
  return (
    <Action.Push
      target={<FavoriteForm onSave={onSave} />}
      title="Add New Favorite"
      shortcut={{ key: "n", modifiers: ["cmd"] }}
      icon={Icon.Plus}
    />
  );
}

export function EditFavoriteAction({
  favorite,
  onSave,
}: {
  favorite: Favorite;
  onSave: (favorite: Favorite) => Promise<void>;
}) {
  return (
    <Action.Push
      target={<FavoriteForm favorite={favorite} onSave={onSave} />}
      title="Edit Favorite"
      shortcut={{ key: "e", modifiers: ["cmd"] }}
      icon={Icon.Pencil}
    />
  );
}

function FavoriteForm({ favorite, onSave }: { favorite?: Favorite; onSave: (favorite: Favorite) => Promise<void> }) {
  const { pop } = useNavigation();
  const { data: company } = useCompany();
  const { data: projects } = useMyProjects();
  const isEditing = !!favorite;

  // Initialize with favorite values if editing, otherwise null/empty
  const [projectId, setProjectId] = useState<string | null>(favorite?.projectId.toString() ?? null);
  const [taskId, setTaskId] = useState<string | null>(favorite?.taskId.toString() ?? null);
  const [notes, setNotes] = useState<string>(favorite?.notes ?? "");
  const [hours, setHours] = useState<string>(favorite?.hours ?? "");

  const groupedProjects = useMemo(() => {
    const grouped = groupBy(projects, (o) => o.client.id);
    return Object.values(grouped);
  }, [projects]);

  const tasks = useMemo(() => {
    const project = find(projects, (o) => {
      return o.project.id === parseInt(projectId ?? "0");
    });
    return project ? project.task_assignments : [];
  }, [projects, projectId]);

  useEffect(() => {
    if (tasks.length === 0) setTaskId(null);
    if (tasks.some((o) => o.task.id.toString() === taskId)) return;
    const defaultTask = tasks[0];

    setTaskId(defaultTask ? defaultTask.task.id.toString() : null);
  }, [tasks, taskId]);

  async function handleSubmit(values: Record<string, Form.Value>) {
    if (values.project_id === null) {
      showToast({
        style: Toast.Style.Failure,
        title: "No Project Selected",
      });
      return;
    }
    if (values.task_id === null) {
      showToast({
        style: Toast.Style.Failure,
        title: "No Task Selected",
      });
      return;
    }

    const selectedProject = find(projects, (o) => o.project.id === parseInt(values.project_id?.toString() ?? "0"));
    const selectedTask = find(tasks, (o) => o.task.id === parseInt(values.task_id?.toString() ?? "0"));

    if (!selectedProject || !selectedTask) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid Selection",
      });
      return;
    }

    // Normalize hours to decimal format (always store as decimal, regardless of input format)
    let normalizedHours: string | undefined = undefined;
    if (hours) {
      if (hours.includes(":")) {
        // Convert H:mm to decimal (keep full precision for accurate rounding later)
        const parsed = hours.split(":");
        const hour = parseInt(parsed[0]) || 0;
        const minute = parseInt(parsed[1]) || 0;
        normalizedHours = (hour + minute / 60).toString();
      } else {
        // Already decimal, validate it's a number
        const parsed = parseFloat(hours);
        normalizedHours = !isNaN(parsed) ? parsed.toString() : undefined;
      }
    }

    const updatedFavorite: Favorite = {
      id: favorite?.id ?? Date.now().toString(), // Reuse existing ID if editing, otherwise create new
      projectId: selectedProject.project.id,
      projectName: selectedProject.project.name,
      taskId: selectedTask.task.id,
      taskName: selectedTask.task.name,
      clientId: selectedProject.client.id,
      clientName: selectedProject.client.name,
      notes: notes || undefined,
      hours: normalizedHours,
    };

    await onSave(updatedFavorite);
    pop();
  }

  return (
    <Form
      navigationTitle={isEditing ? "Edit Favorite" : "Add New Favorite"}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title={isEditing ? "Save Changes" : "Add Favorite"} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="project_id"
        title="Project"
        value={projectId ?? ""}
        onChange={(newValue) => {
          setProjectId(newValue);
        }}
      >
        {groupedProjects?.map((groupedProject) => {
          const client = groupedProject[0].client;
          return (
            <Form.Dropdown.Section title={client.name} key={client.id}>
              {groupedProject.map((project) => {
                const code = project.project.code;
                return (
                  <Form.Dropdown.Item
                    keywords={[project.client.name.toLowerCase()]}
                    value={project.project.id.toString()}
                    title={`${code && code !== "" ? "[" + code + "] " : ""}${project.project.name}`}
                    key={project.id}
                  />
                );
              })}
            </Form.Dropdown.Section>
          );
        })}
      </Form.Dropdown>
      <Form.Dropdown id="task_id" title="Task" value={taskId ?? ""} onChange={setTaskId}>
        {tasks?.map((task) => {
          return <Form.Dropdown.Item value={task.task.id.toString()} title={task.task.name} key={task.id} />;
        })}
      </Form.Dropdown>

      <Form.Separator />

      <Form.TextArea id="notes" title="Notes" value={notes} onChange={setNotes} placeholder="Optional notes" />
      {!company?.wants_timestamp_timers && (
        <Form.TextField
          id="hours"
          title="Duration"
          placeholder="Leave blank to start a timer"
          value={hours}
          onChange={setHours}
        />
      )}
    </Form>
  );
}

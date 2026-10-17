import { Action, Form, Icon, useNavigation, Keyboard } from "@raycast/api";
import { useEffect, useState } from "react";
import { Favorite, normalizeFavoriteHours } from "./services/keito/favorites";
import { formatHours as formatHoursValue } from "./services/keito/normalize";
import { ResolvedSession } from "./services/keito/session";
import { ProjectDropdownItems } from "./new";
import { getKeitoPreferences, useProjects, useProjectTasks } from "./services/useKeito";
import { ActionPanel } from "@raycast/api";

type OnSave = (favorite: Favorite) => Promise<void>;

export function AddFavoriteAction({ session, onSave }: { session: ResolvedSession; onSave: OnSave }) {
  return (
    <Action.Push
      target={<FavoriteForm session={session} onSave={onSave} />}
      title="Add New Favorite"
      shortcut={Keyboard.Shortcut.Common.New}
      icon={Icon.Plus}
    />
  );
}

export function EditFavoriteAction({
  session,
  favorite,
  onSave,
}: {
  session: ResolvedSession;
  favorite: Favorite;
  onSave: OnSave;
}) {
  return (
    <Action.Push
      target={<FavoriteForm session={session} favorite={favorite} onSave={onSave} />}
      title="Edit Favorite"
      shortcut={Keyboard.Shortcut.Common.Edit}
      icon={Icon.Pencil}
    />
  );
}

function FavoriteForm({
  session,
  favorite,
  onSave,
}: {
  session: ResolvedSession;
  favorite?: Favorite;
  onSave: OnSave;
}) {
  const { pop } = useNavigation();
  const timeFormat = getKeitoPreferences().timeFormat ?? "hours_minutes";
  const { data: projects, isLoading: isLoadingProjects, byId } = useProjects(session.scope);
  const [projectId, setProjectId] = useState<string | null>(favorite?.projectId ?? null);
  const [taskId, setTaskId] = useState<string | null>(favorite?.taskId ?? null);
  const { data: tasks, isLoading: isLoadingTasks } = useProjectTasks(session.scope, projectId);
  const [notes, setNotes] = useState(favorite?.notes ?? "");
  const [hours, setHours] = useState(favorite?.hours ? formatHoursValue(Number(favorite.hours), timeFormat) : "");
  const [errors, setErrors] = useState<{ project?: string; task?: string; hours?: string }>({});

  useEffect(() => {
    if (isLoadingProjects || !projects.length || (projectId && byId.has(projectId))) return;
    setProjectId(projects[0].id);
  }, [projects, isLoadingProjects]);

  useEffect(() => {
    if (isLoadingTasks || !projectId || !tasks.length) return;
    if (taskId && tasks.some((t) => t.id === taskId)) return;
    setTaskId(tasks[0].id);
  }, [tasks, isLoadingTasks, projectId]);

  async function handleSubmit() {
    const project = projectId ? byId.get(projectId) : undefined;
    const task = tasks.find((t) => t.id === taskId);
    if (!project) return setErrors({ project: "Choose an active project." });
    if (!task) return setErrors({ task: "Choose a task assigned to this project." });
    const normalizedHours = normalizeFavoriteHours(hours);
    if (normalizedHours === null) return setErrors({ hours: "Enter a duration such as 1:30 or 1.5, or leave blank." });

    await onSave({
      id: favorite?.id ?? `${Date.now()}`,
      projectId: project.id,
      projectName: project.name,
      projectCode: project.code,
      taskId: task.id,
      taskName: task.name,
      clientId: project.clientId,
      clientName: project.clientName,
      notes: notes.trim() || undefined,
      hours: normalizedHours,
    });
    pop();
  }

  return (
    <Form
      navigationTitle={favorite ? "Edit Favorite" : "Add New Favorite"}
      isLoading={isLoadingProjects || isLoadingTasks}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={favorite ? "Save Changes" : "Add Favorite"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="project_id"
        title="Project"
        value={projectId ?? ""}
        error={errors.project}
        onChange={(value) => {
          setProjectId(value || null);
          setErrors({});
        }}
      >
        <ProjectDropdownItems projects={projects} />
      </Form.Dropdown>
      <Form.Dropdown
        id="task_id"
        title="Task"
        value={taskId && tasks.some((t) => t.id === taskId) ? taskId : ""}
        error={errors.task}
        onChange={(value) => {
          setTaskId(value || null);
          setErrors({});
        }}
      >
        {tasks.map((task) => (
          <Form.Dropdown.Item key={task.id} value={task.id} title={task.name} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextArea id="notes" title="Notes" value={notes} onChange={setNotes} placeholder="Optional notes" />
      <Form.TextField
        id="hours"
        title="Duration"
        placeholder="Leave blank to start a timer"
        value={hours}
        error={errors.hours}
        onChange={(v) => {
          setHours(v);
          setErrors({});
        }}
        info="With a duration, the favorite logs a completed entry for today. Without one, it starts a timer."
      />
    </Form>
  );
}

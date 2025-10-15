import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { useCompany, useMyProjects } from "./services/harvest";
import { HarvestProjectAssignment } from "./services/responseTypes";
import { Dictionary, find, groupBy, reduce } from "lodash";
import { Favorite } from "./favorites";

export function AddFavoriteAction({ onSave }: { onSave: (favorite: Favorite) => Promise<void> }) {
  return (
    <Action.Push
      target={<AddFavoriteForm onSave={onSave} />}
      title="Add New Favorite"
      shortcut={{ key: "n", modifiers: ["cmd"] }}
      icon={Icon.Plus}
    />
  );
}

function AddFavoriteForm({ onSave }: { onSave: (favorite: Favorite) => Promise<void> }) {
  const { pop } = useNavigation();
  const { data: company } = useCompany();
  const { data: projects } = useMyProjects();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>("");
  const [hours, setHours] = useState<string>("");

  const groupedProjects = useMemo(() => {
    return reduce<
      Dictionary<[HarvestProjectAssignment, ...HarvestProjectAssignment[]]>,
      Array<Array<HarvestProjectAssignment>>
    >(
      groupBy(projects, (o) => o.client.id),
      (result, value) => {
        result.push(value);
        return result;
      },
      []
    );
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

  function setTimeFormat(value?: string) {
    if (!value) return;

    if (company?.time_format === "decimal") {
      if (value.includes(":")) {
        const parsed = value.split(":");
        const hour = parseInt(parsed[0]);
        const minute = parseInt(parsed[1]);
        if (!isNaN(hour)) {
          if (!isNaN(minute)) {
            value = parseFloat(`${hour}.${minute / 60}`)
              .toFixed(2)
              .toString();
          } else {
            value = hour.toString();
          }
        }
      }
    }
    if (company?.time_format === "hours_minutes") {
      if (!value.includes(":")) {
        const parsed = parseFloat(value);
        if (!isNaN(parsed)) {
          const hour = Math.floor(parsed);
          const minute = parseInt(((parsed - hour) * 60).toFixed(0));
          value = `${hour}:${minute < 10 ? "0" : ""}${minute}`;
        }
      }
    }
    return setHours(value);
  }

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

    const favorite: Favorite = {
      id: Date.now().toString(),
      projectId: selectedProject.project.id,
      projectName: selectedProject.project.name,
      taskId: selectedTask.task.id,
      taskName: selectedTask.task.name,
      clientId: selectedProject.client.id,
      clientName: selectedProject.client.name,
      notes: notes || undefined,
      hours: hours || undefined,
    };

    await onSave(favorite);
    pop();
  }

  return (
    <Form
      navigationTitle="Add New Favorite"
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Add Favorite" />
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
          onBlur={() => setTimeFormat(hours)}
        />
      )}
    </Form>
  );
}

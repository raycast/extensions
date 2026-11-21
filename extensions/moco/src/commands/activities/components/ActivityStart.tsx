import { ActionPanel, Action, Form, useNavigation, Icon } from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { useEffect } from "react";
import { Task } from "../../tasks/types";
import { startActivity } from "../api";
import { fetchProjects } from "../../projects/api";
import { Project } from "../../projects/types";
import { localDate, parseHours, validateTime } from "../utils";

interface ActivityStartProps {
  task?: Task;
  projectID?: number | null;
  // Called after a successful submit. Defaults to popping the form.
  onSubmitted?: () => Promise<void>;
}

interface ActivityStartValues {
  projectDropdown: string;
  taskDropdown: string;
  description: string;
  date: Date | null;
  hours: string;
}

export const ActivityStart: React.FC<ActivityStartProps> = ({ task, projectID, onSubmitted }) => {
  const navi = useNavigation();
  // With a given task the dropdowns are hidden, so the projects are not needed.
  const { data: projects = [], isLoading } = useCachedPromise(fetchProjects, [], {
    execute: task === undefined,
    keepPreviousData: true,
  });

  const { handleSubmit, itemProps, values, setValue } = useForm<ActivityStartValues>({
    initialValues: { description: "", date: new Date(), hours: "" },
    validation: {
      projectDropdown: task ? undefined : FormValidation.Required,
      taskDropdown: task ? undefined : FormValidation.Required,
      description: FormValidation.Required,
      hours: validateTime,
    },
    onSubmit: async (values) => {
      const success = await startActivity({
        description: values.description,
        hours: values.hours.trim() === "" ? "" : parseHours(values.hours),
        date: localDate(values.date ?? new Date()),
        projectID: task ? task.projectID : values.projectDropdown ? Number(values.projectDropdown) : projectID,
        taskID: task ? task.id : Number(values.taskDropdown),
      });
      if (success !== true) {
        return;
      }
      if (onSubmitted) {
        await onSubmitted();
      } else {
        navi.pop();
      }
    },
  });

  const startTimer = values.hours.trim() === "";
  const projectsByCustomer = projects.reduce((result: Record<string, Project[]>, project: Project) => {
    const customerName = project.customer?.name ?? "Other";
    (result[customerName] = result[customerName] || []).push(project);
    return result;
  }, {});
  const selectedProject = projects.find((project) => String(project.id) === values.projectDropdown);

  // The task dropdown is controlled: after a project change, reset a task that belongs to another project.
  // setValue always creates a new values object, so only call it on a real change (else it re-renders endlessly).
  useEffect(() => {
    if (task) {
      return;
    }
    const tasks = selectedProject?.tasks ?? [];
    const current = values.taskDropdown;
    const next = tasks.some((t) => String(t.id) === current) ? current : tasks.length > 0 ? String(tasks[0].id) : "";
    if (next !== current) {
      setValue("taskDropdown", next);
    }
  }, [task, selectedProject, values.taskDropdown]);

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={task ? `${task.projectName}/${task.name}` : "New Activity"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={startTimer ? Icon.Stopwatch : Icon.SaveDocument}
            title={startTimer ? "Start Timer" : "Log Work"}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      {!task ? (
        <Form.Dropdown title="Project" {...itemProps.projectDropdown}>
          {Object.entries(projectsByCustomer).map(([customerName, customerProjects]) => (
            <Form.Dropdown.Section key={customerName} title={customerName}>
              {customerProjects.map((project) => (
                <Form.Dropdown.Item key={project.id} title={project.name} value={project.id.toString()} />
              ))}
            </Form.Dropdown.Section>
          ))}
        </Form.Dropdown>
      ) : null}
      {!task ? (
        <Form.Dropdown title="Task" {...itemProps.taskDropdown}>
          {(selectedProject?.tasks ?? []).map((task) => (
            <Form.Dropdown.Item key={task.id} title={task.name} value={task.id.toString()} />
          ))}
        </Form.Dropdown>
      ) : null}
      <Form.TextArea title="Add Description" placeholder="Describe what you are doing" {...itemProps.description} />
      <Form.DatePicker type={Form.DatePicker.Type.Date} title="Booking Date" {...itemProps.date} />
      <Form.TextField
        title="Hours Worked"
        placeholder="Leaving this field empty will start a timer"
        {...itemProps.hours}
      />
    </Form>
  );
};

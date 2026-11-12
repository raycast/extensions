import { ActionPanel, Action, Form, useNavigation, Icon, showToast, Toast } from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { Task } from "../../tasks/types";
import { startActivity } from "../api";
import { fetchProjects } from "../../projects/api";
import { Project } from "../../projects/types";
import { localDate, parseHours, validateTime } from "../utils";
import { jiraActivityLink, JiraIssue } from "../../../utils/jira";
import { makeTimerDefault, scopeForIssue } from "../../../utils/jira-defaults";
import { JiraTicketTime } from "./JiraTicketTime";

interface ActivityStartProps {
  task?: Task;
  projectID?: number | null;
  initialDescription?: string;
  jiraIssue?: JiraIssue;
  assignedProjects?: Project[];
  initialSelection?: { projectId: string; taskId: string; notice: string };
  defaultScopeLabel?: string;
  contextNotice?: string;
  onClearJira?: () => void;
  onSaveDefaults?: (projectId: string, taskId: string) => Promise<void>;
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

export const ActivityStart: React.FC<ActivityStartProps> = ({
  task,
  projectID,
  initialDescription = "",
  jiraIssue,
  assignedProjects,
  initialSelection,
  onSaveDefaults,
  defaultScopeLabel = "for plain timers",
  contextNotice,
  onClearJira,
  onSubmitted,
}) => {
  const navi = useNavigation();
  const [rememberDefault, setRememberDefault] = useState(true);
  const [ticketTimeRefresh, setTicketTimeRefresh] = useState(0);
  // With a given task the dropdowns are hidden, so the projects are not needed.
  const { data: fetchedProjects = [], isLoading } = useCachedPromise(fetchProjects, [], {
    execute: task === undefined && assignedProjects === undefined,
    keepPreviousData: true,
  });
  const projects = assignedProjects ?? fetchedProjects;

  const saveDefaults = async (projectId: string, taskId: string): Promise<boolean> => {
    if (!onSaveDefaults) return true;
    try {
      makeTimerDefault(Number(projectId), Number(taskId), projects);
      await onSaveDefaults(projectId, taskId);
      return true;
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not save timer defaults",
        message: error instanceof Error ? error.message : "Try again.",
      });
      return false;
    }
  };

  const { handleSubmit, itemProps, values, setValue } = useForm<ActivityStartValues>({
    initialValues: {
      ...(initialSelection
        ? { projectDropdown: initialSelection.projectId, taskDropdown: initialSelection.taskId }
        : {}),
      description: initialDescription,
      date: new Date(),
      hours: "",
    },
    validation: {
      projectDropdown: task ? undefined : FormValidation.Required,
      taskDropdown: task ? undefined : FormValidation.Required,
      description: FormValidation.Required,
      hours: validateTime,
    },
    onSubmit: async (values) => {
      if (initialSelection) {
        try {
          makeTimerDefault(Number(values.projectDropdown), Number(values.taskDropdown), projects);
        } catch {
          await showToast({ style: Toast.Style.Failure, title: "Choose an available project and role / service" });
          return;
        }
        if (rememberDefault && !(await saveDefaults(values.projectDropdown, values.taskDropdown))) return;
      }
      const success = await startActivity({
        description: values.description,
        hours: values.hours.trim() === "" ? "" : parseHours(values.hours),
        date: localDate(values.date ?? new Date()),
        projectID: task ? task.projectID : values.projectDropdown ? Number(values.projectDropdown) : projectID,
        taskID: task ? task.id : Number(values.taskDropdown),
        ...(jiraIssue ? jiraActivityLink(jiraIssue) : {}),
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
    const tasks = (selectedProject?.tasks ?? []).filter((t) => !initialSelection || t.active !== false);
    const current = values.taskDropdown;
    const next = tasks.some((t) => String(t.id) === current)
      ? current
      : !initialSelection && tasks.length > 0
        ? String(tasks[0].id)
        : "";
    if (next !== current) {
      setValue("taskDropdown", next);
    }
  }, [task, selectedProject, values.taskDropdown, initialSelection]);

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={
        jiraIssue ? `MOCO · ${jiraIssue.key}` : task ? `${task.projectName}/${task.name}` : "New Activity"
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={startTimer ? Icon.Stopwatch : Icon.SaveDocument}
            title={startTimer ? "Start Timer" : "Log Work"}
            onSubmit={handleSubmit}
          />
          {jiraIssue ? (
            <Action.OpenInBrowser
              title="Open Jira Ticket"
              url={jiraIssue.url}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          ) : null}
          {jiraIssue ? (
            <Action
              title="Refresh Jira Ticket Time"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => setTicketTimeRefresh((n) => n + 1)}
            />
          ) : null}
          {onClearJira ? (
            <Action title="Use without Jira Ticket" icon={Icon.XMarkCircle} onAction={onClearJira} />
          ) : null}
          {onSaveDefaults ? (
            <Action
              title="Save Project and Role Defaults"
              icon={Icon.Pin}
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
              onAction={async () => {
                if (await saveDefaults(values.projectDropdown, values.taskDropdown)) {
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Project and role defaults saved",
                  });
                }
              }}
            />
          ) : null}
        </ActionPanel>
      }
    >
      {jiraIssue ? (
        <Form.Description title="Ticket" text={`${jiraIssue.key} · ${new URL(jiraIssue.url).hostname}`} />
      ) : null}
      {jiraIssue ? <JiraTicketTime key={jiraIssue.url} issue={jiraIssue} refresh={ticketTimeRefresh} /> : null}
      {contextNotice ? <Form.Description title="Browser" text={contextNotice} /> : null}
      {initialSelection?.notice ? <Form.Description title="Saved Defaults" text={initialSelection.notice} /> : null}
      {jiraIssue ? <Form.Separator /> : null}
      {!task ? (
        <Form.Dropdown title="Project" {...itemProps.projectDropdown}>
          {initialSelection ? <Form.Dropdown.Item title="Choose a MOCO project…" value="" /> : null}
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
        <Form.Dropdown title={initialSelection ? "Role / Service" : "Task"} {...itemProps.taskDropdown}>
          {initialSelection ? <Form.Dropdown.Item title="Choose a role / service…" value="" /> : null}
          {(selectedProject?.tasks ?? [])
            .filter((t) => !initialSelection || t.active !== false)
            .map((task) => (
              <Form.Dropdown.Item key={task.id} title={task.name} value={task.id.toString()} />
            ))}
        </Form.Dropdown>
      ) : null}
      <Form.TextArea
        title="Description"
        placeholder={
          jiraIssue && !jiraIssue.summary ? "Add the ticket summary or describe your work" : "What are you working on?"
        }
        info={
          jiraIssue
            ? "The Jira ticket link is attached automatically. Your time shows your recorded MOCO entries for this ticket, across all dates. Press ⌘R to refresh it."
            : undefined
        }
        autoFocus={Boolean(task || (initialSelection?.projectId && initialSelection.taskId))}
        {...itemProps.description}
      />
      <Form.Separator />
      {onSaveDefaults ? (
        <Form.Checkbox
          id="rememberTimerDefault"
          title="Defaults"
          label={jiraIssue ? `Remember for ${scopeForIssue(jiraIssue).prefix}-* tickets` : "Remember for plain timers"}
          info={`Save this project and role ${defaultScopeLabel}. Uncheck for a one-off booking.`}
          value={rememberDefault}
          onChange={setRememberDefault}
        />
      ) : null}
      <Form.DatePicker type={Form.DatePicker.Type.Date} title="Date" {...itemProps.date} />
      <Form.TextField
        title="Duration"
        placeholder="Leave empty to start a timer"
        info="Optional: enter h:mm or decimal hours to log completed work instead."
        {...itemProps.hours}
      />
    </Form>
  );
};

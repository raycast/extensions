import { Action, ActionPanel, AI, Form, Icon, popToRoot, showToast, Toast, useNavigation } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useCallback, useMemo, useState } from "react";

import { createTask } from "./api/mutations";
import type { NavigableView, ProjectRecord, TeamRecord } from "./api/types";
import { VIEW_CONFIG } from "./helpers/constants";
import { dateOnlyEpochFromLocalDate, localDateFromDateOnlyEpoch, tomorrowDateOnlyEpoch } from "./helpers/date-codecs";
import { interpretQuickAddTask, type InterpretedQuickAddTask } from "./helpers/ai-quick-add";
import { parseQuickAddTask } from "./helpers/quick-add-parser";
import { revalidateAfterMutation } from "./helpers/revalidate";
import { useProjects } from "./hooks/use-projects";
import { useTeams } from "./hooks/use-teams";
import { ALL_WORKSPACES_ID, useWorkspaces } from "./hooks/use-workspaces";
import { oauthService } from "./oauth";

interface QuickAddTaskProps {
  fallbackView?: NavigableView;
  initialValue?: string;
  onCreated?: () => void;
}

interface CaptureValues {
  task: string;
  workspaceId?: string;
}

interface ReviewValues {
  deadline: Date | null;
  projectId: string;
  startDate: Date | null;
  teamId: string;
  title: string;
  when: string;
}

const dateLabel = (epoch: number, now = new Date()): string => {
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (epoch === today) {
    return "today";
  }
  if (epoch === tomorrow) {
    return "tomorrow";
  }
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    weekday: "short",
  }).format(new Date(epoch));
};

const previewText = (value: string, fallbackView: NavigableView): string => {
  if (!value.trim()) {
    return `Try “Call Sam tomorrow by Friday”. Without a date, tasks go to ${VIEW_CONFIG[fallbackView].title}.`;
  }

  const parsed = parseQuickAddTask(value, new Date(), fallbackView);
  if (!parsed.title) {
    return "Enter a task title. Dates and list names are optional.";
  }

  const parts = [`“${parsed.title}”`, VIEW_CONFIG[parsed.view].title];
  if (parsed.startDate !== undefined) {
    parts.push(`starts ${dateLabel(parsed.startDate)}`);
  }
  if (parsed.deadlineAt !== undefined) {
    parts.push(`due ${dateLabel(parsed.deadlineAt)}`);
  }
  return parts.join(" · ");
};

const ReviewQuickAddTask = ({
  interpretation,
  onCreated,
  projects,
  teams,
  workspaceId,
}: {
  interpretation: InterpretedQuickAddTask;
  onCreated?: () => void;
  projects: ProjectRecord[];
  teams: TeamRecord[];
  workspaceId: string;
}) => {
  const [whenValue, setWhenValue] = useState<NavigableView>(interpretation.view);
  const [title, setTitle] = useState(interpretation.title);
  const [titleError, setTitleError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (values: ReviewValues): Promise<boolean | void> => {
      const trimmedTitle = values.title.trim();
      if (!trimmedTitle) {
        setTitleError("Enter a task title");
        return false;
      }

      setIsSubmitting(true);
      try {
        try {
          await createTask(workspaceId, {
            deadlineAt: values.deadline ? dateOnlyEpochFromLocalDate(values.deadline) : undefined,
            projectId: values.projectId || undefined,
            startDate: values.startDate ? dateOnlyEpochFromLocalDate(values.startDate) : undefined,
            teamId: values.teamId || undefined,
            title: trimmedTitle,
            view: values.when as NavigableView,
          });
        } catch {
          await showToast({
            message: "Check your connection and try again. Your task is still here.",
            style: Toast.Style.Failure,
            title: "Task not created",
          });
          return false;
        }

        await revalidateAfterMutation(onCreated);
        await showToast({
          message: VIEW_CONFIG[values.when as NavigableView].title,
          style: Toast.Style.Success,
          title: "Task created",
        });
        await popToRoot();
      } finally {
        setIsSubmitting(false);
      }
    },
    [onCreated, workspaceId],
  );

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} onSubmit={handleSubmit} title="Create Task" />
        </ActionPanel>
      }
      isLoading={isSubmitting}
    >
      <Form.Description
        text={
          interpretation.source === "ai"
            ? "Interpreted with Raycast AI. Review the details before creating the task."
            : "Raycast AI was unavailable. Common date phrases were parsed on this Mac."
        }
        title="Review"
      />
      <Form.TextField
        autoFocus
        error={titleError}
        id="title"
        onChange={(value) => {
          setTitle(value);
          if (value.trim()) {
            setTitleError(undefined);
          }
        }}
        title="Title"
        value={title}
      />
      <Form.Dropdown
        defaultValue={interpretation.view}
        id="when"
        onChange={(value) => setWhenValue(value as NavigableView)}
        title="When"
      >
        <Form.Dropdown.Item title="Inbox" value="inbox" />
        <Form.Dropdown.Item title="Today" value="today" />
        <Form.Dropdown.Item title="Anytime" value="anytime" />
        <Form.Dropdown.Item title="Upcoming" value="upcoming" />
        <Form.Dropdown.Item title="Someday" value="someday" />
      </Form.Dropdown>
      {whenValue === "upcoming" && (
        <Form.DatePicker
          defaultValue={localDateFromDateOnlyEpoch(interpretation.startDate ?? tomorrowDateOnlyEpoch())}
          id="startDate"
          title="Start Date"
        />
      )}
      <Form.DatePicker
        defaultValue={localDateFromDateOnlyEpoch(interpretation.deadlineAt)}
        id="deadline"
        title="Deadline"
      />
      <Form.Dropdown defaultValue={interpretation.projectId || ""} id="projectId" title="Project">
        <Form.Dropdown.Item title="No Project" value="" />
        {projects.map((project) => (
          <Form.Dropdown.Item key={project.id} title={project.name} value={project.id} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown defaultValue={interpretation.teamId || ""} id="teamId" title="Team">
        <Form.Dropdown.Item title="No Team" value="" />
        {teams.map((team) => (
          <Form.Dropdown.Item key={team.id} title={team.name} value={team.id} />
        ))}
      </Form.Dropdown>
    </Form>
  );
};

export const QuickAddTask = ({ fallbackView = "inbox", initialValue = "", onCreated }: QuickAddTaskProps) => {
  const { push } = useNavigation();
  const { workspaces, workspaceId: selectedWorkspaceId, isLoading: isLoadingWorkspace } = useWorkspaces();
  const isAll = selectedWorkspaceId === ALL_WORKSPACES_ID;
  const [formWorkspaceId, setFormWorkspaceId] = useState("");
  const effectiveWorkspaceId = isAll ? formWorkspaceId || workspaces[0]?.id || null : selectedWorkspaceId;
  const { projects, isLoading: isLoadingProjects } = useProjects(effectiveWorkspaceId);
  const { teams, isLoading: isLoadingTeams } = useTeams(effectiveWorkspaceId);
  const [taskText, setTaskText] = useState(initialValue);
  const [taskError, setTaskError] = useState<string>();
  const [isInterpreting, setIsInterpreting] = useState(false);
  const preview = useMemo(() => previewText(taskText, fallbackView), [fallbackView, taskText]);

  const handleTaskChange = useCallback((value: string) => {
    setTaskText(value);
    if (value.trim()) {
      setTaskError(undefined);
    }
  }, []);

  const handleSubmit = useCallback(
    async (values: CaptureValues): Promise<boolean | void> => {
      const fallback = parseQuickAddTask(values.task, new Date(), fallbackView);
      if (!fallback.title) {
        setTaskError("Enter a task title");
        return false;
      }

      const targetWorkspaceId = isAll ? values.workspaceId || workspaces[0]?.id : selectedWorkspaceId;
      if (!targetWorkspaceId) {
        await showToast({
          message: "Choose a workspace and try again.",
          style: Toast.Style.Failure,
          title: "Task not interpreted",
        });
        return false;
      }

      setIsInterpreting(true);
      const interpretation = await interpretQuickAddTask(values.task, {
        ask: (prompt) => AI.ask(prompt, { creativity: "none" }),
        fallbackView,
        projects,
        teams,
      });
      setIsInterpreting(false);
      push(
        <ReviewQuickAddTask
          interpretation={interpretation}
          onCreated={onCreated}
          projects={projects}
          teams={teams}
          workspaceId={targetWorkspaceId}
        />,
      );
    },
    [fallbackView, isAll, onCreated, projects, push, selectedWorkspaceId, teams, workspaces],
  );

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Stars} onSubmit={handleSubmit} title="Interpret with AI" />
        </ActionPanel>
      }
      isLoading={isLoadingWorkspace || isLoadingProjects || isLoadingTeams || isInterpreting}
    >
      <Form.TextField
        autoFocus
        error={taskError}
        id="task"
        info="Raycast AI understands natural dates, lists, projects, teams, and deadlines."
        onChange={handleTaskChange}
        placeholder="Call Sam tomorrow by Friday"
        title="Task"
        value={taskText}
      />
      <Form.Description text={preview} title="Quick Preview" />
      <Form.Description
        text="Your sentence is sent to Raycast AI when you continue. You review every detail before creation."
        title="Privacy"
      />
      {isAll && workspaces.length > 1 && (
        <Form.Dropdown
          defaultValue={workspaces[0]?.id}
          id="workspaceId"
          onChange={setFormWorkspaceId}
          title="Workspace"
        >
          {workspaces.map((workspace) => (
            <Form.Dropdown.Item key={workspace.id} title={workspace.name} value={workspace.id} />
          ))}
        </Form.Dropdown>
      )}
    </Form>
  );
};

export default withAccessToken(oauthService)(QuickAddTask);

import { useState, useRef, useEffect } from "react";
import { Clipboard, Form, ActionPanel, Action, Icon, Toast, getPreferenceValues, useNavigation } from "@raycast/api";
import { IssuePriorityValue, User } from "@linear/sdk";

import { getLastCreatedIssues } from "../api/getIssues";
import { createIssue, CreateIssuePayload } from "../api/createIssue";

import useLabels from "../hooks/useLabels";
import useStates from "../hooks/useStates";
import useTeams from "../hooks/useTeams";
import useCycles from "../hooks/useCycles";
import useIssues from "../hooks/useIssues";
import useProjects from "../hooks/useProjects";

import { getEstimateScale } from "../helpers/estimates";
import { getOrderedStates, statusIcons } from "../helpers/states";
import { getErrorMessage } from "../helpers/errors";
import { priorityIcons } from "../helpers/priorities";
import { getUserIcon } from "../helpers/users";
import { getCycleOptions } from "../helpers/cycles";
import { projectStatusText } from "../helpers/projects";
import { getTeamIcon } from "../helpers/teams";

import IssueDetail from "./IssueDetail";

type CreateIssueFormProps = {
  assigneeId?: string;
  cycleId?: string;
  teamId?: string;
  projectId?: string;
  parentId?: string;
  priorities: IssuePriorityValue[] | undefined;
  users: User[] | undefined;
  me: User | undefined;
  isLoading?: boolean;
  draftValues?: CreateIssueValues;
  enableDrafts?: boolean;
};

export type CreateIssueValues = {
  teamId: string;
  title: string;
  description: string;
  stateId: string;
  priority: string;
  assigneeId: string;
  labelIds: string[];
  estimate: string;
  dueDate: Date;
  cycleId: string;
  projectId: string;
  parentId: string;
};

export default function CreateIssueForm(props: CreateIssueFormProps) {
  const { push } = useNavigation();

  const { signature } = getPreferenceValues<{ signature: boolean }>();

  const titleField = useRef<Form.TextField>(null);

  const [teamId, setTeamId] = useState(props.draftValues?.teamId || props.teamId);
  const [title, setTitle] = useState(props.draftValues?.title);
  const [description, setDescription] = useState(props.draftValues?.description);
  const [priority, setPriority] = useState(props.draftValues?.priority);
  const [stateId, setStateId] = useState(props.draftValues?.stateId);
  const [estimate, setEstimate] = useState(props.draftValues?.estimate);
  const [assigneeId, setAssigneeId] = useState(props.draftValues?.assigneeId || props.assigneeId);
  const [labelIds, setLabelIds] = useState<string[]>(props.draftValues?.labelIds || []);
  const [dueDate, setDueDate] = useState(props.draftValues?.dueDate);
  const [cycleId, setCycleId] = useState(props.draftValues?.cycleId || props.cycleId);
  const [projectId, setProjectId] = useState(props.draftValues?.projectId || props.projectId);
  const [parentId, setParentId] = useState(props.draftValues?.parentId || props.parentId);

  const [titleError, setTitleError] = useState<string | undefined>();

  const { teams, isLoadingTeams } = useTeams();
  const { states } = useStates(teamId);
  const { labels } = useLabels(teamId);
  const { cycles } = useCycles(teamId);
  const { issues } = useIssues(getLastCreatedIssues);
  const { projects } = useProjects(teamId);

  useEffect(() => {
    if (teams?.length === 1) {
      setTeamId(teams[0].id);
    }
  }, [teams]);
  const team = teams?.find((team) => team.id === teamId);

  const scale = team
    ? getEstimateScale({
        issueEstimationType: team.issueEstimationType,
        issueEstimationAllowZero: team.issueEstimationAllowZero,
        issueEstimationExtended: team.issueEstimationExtended,
      })
    : null;

  const orderedStates = getOrderedStates(states || []);

  const hasMoreThanOneTeam = teams && teams.length > 1;
  const hasStates = states && states.length > 0;
  const hasPriorities = props.priorities && props.priorities.length > 0;
  const hasUsers = props.users && props.users.length > 0;
  const hasLabels = labels && labels.length > 0;
  const hasCycles = cycles && cycles.length > 0;
  const hasProjects = projects && projects.length > 0;
  const hasIssues = issues && issues.length > 0;

  async function handleSubmit() {
    if (!title || !teamId || !stateId || !priority) {
      console.log("missing some content", { title, teamId, description, stateId, priority });
      return;
    }

    const toast = new Toast({ style: Toast.Style.Animated, title: "Creating issue" });
    await toast.show();

    let payloadDescription = description || "";
    if (signature) {
      if (description) {
        payloadDescription += "\n\n---\n";
      }

      payloadDescription += "Created via [Raycast](https://www.raycast.com)";
    }

    try {
      const payload: CreateIssuePayload = {
        teamId,
        title,
        description: payloadDescription,
        stateId,
        labelIds,
        dueDate,
        ...(scale && estimate ? { estimate: parseInt(estimate) } : {}),
        ...(assigneeId ? { assigneeId } : {}),
        ...(cycleId ? { cycleId } : {}),
        ...(projectId ? { projectId } : {}),
        ...(parentId ? { parentId } : {}),
        priority: parseInt(priority),
      };

      const { success, issue } = await createIssue(payload);

      if (success && issue) {
        toast.style = Toast.Style.Success;
        toast.title = `Created Issue • ${issue?.identifier}`;

        toast.primaryAction = {
          title: "Open Issue",
          shortcut: { modifiers: ["cmd", "shift"], key: "o" },
          onAction: async () => {
            push(<IssueDetail issue={issue} priorities={props.priorities} users={props.users} me={props.me} />);
            await toast.hide();
          },
        };

        toast.secondaryAction = {
          title: "Copy Issue Key",
          shortcut: { modifiers: ["cmd", "shift"], key: "c" },
          onAction: () => Clipboard.copy(issue.identifier),
        };

        setTitle("");
        setDescription("");
        setLabelIds([]);
        setParentId("");
        setEstimate("");

        titleField.current?.focus();
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create issue";
      toast.message = getErrorMessage(error);
    }
  }

  function dropTitleErrorIfNeeded() {
    if (titleError && titleError.length > 0) {
      setTitleError(undefined);
    }
  }

  return (
    <Form
      enableDrafts={props.enableDrafts}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Create Issue" />
        </ActionPanel>
      }
      isLoading={isLoadingTeams}
    >
      {hasMoreThanOneTeam ? (
        <>
          <Form.Dropdown
            id="teamId"
            title="Team"
            value={teamId}
            onChange={(teamId) => {
              setStateId("");
              setTeamId(teamId);
            }}
            storeValue
          >
            {teams.map((team) => {
              return <Form.Dropdown.Item title={team.name} value={team.id} key={team.id} icon={getTeamIcon(team)} />;
            })}
          </Form.Dropdown>
          <Form.Separator />
        </>
      ) : null}

      <Form.TextField
        id="title"
        title="Title"
        placeholder="Issue title"
        ref={titleField}
        value={title}
        error={titleError}
        onChange={(title) => {
          setTitle(title);
          dropTitleErrorIfNeeded();
        }}
        autoFocus
        onBlur={(event) => {
          if (event.target.value?.length === 0) {
            setTitleError("The title is required");
          } else {
            dropTitleErrorIfNeeded();
          }
        }}
      />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Add some details (supports Markdown, e.g. **bold**)"
        enableMarkdown
        value={description}
        onChange={setDescription}
      />

      <Form.Dropdown id="stateId" title="Status" value={stateId} onChange={setStateId} storeValue>
        {hasStates
          ? orderedStates.map((state) => {
              return (
                <Form.Dropdown.Item
                  title={state.name}
                  value={state.id}
                  key={state.id}
                  icon={{ source: statusIcons[state.type], tintColor: state.color }}
                />
              );
            })
          : null}
      </Form.Dropdown>

      <Form.Dropdown id="priority" title="Priority" value={priority} onChange={setPriority} storeValue>
        {hasPriorities
          ? props.priorities?.map(({ priority, label }) => {
              return (
                <Form.Dropdown.Item
                  title={label}
                  value={String(priority)}
                  key={priority}
                  icon={{ source: priorityIcons[priority] }}
                />
              );
            })
          : null}
      </Form.Dropdown>

      {hasUsers ? (
        <Form.Dropdown id="assigneeId" title="Assignee" value={assigneeId} onChange={setAssigneeId} storeValue>
          <Form.Dropdown.Item title="Unassigned" value="" icon={Icon.Person} />

          {props.users?.map((user) => {
            return <Form.Dropdown.Item title={user.name} value={user.id} key={user.id} icon={getUserIcon(user)} />;
          })}
        </Form.Dropdown>
      ) : null}

      <Form.TagPicker id="labelIds" title="Labels" value={labelIds} onChange={setLabelIds} placeholder="Add label">
        {hasLabels
          ? labels.map(({ id, name, color }) => (
              <Form.TagPicker.Item title={name} value={id} key={id} icon={{ source: Icon.Dot, tintColor: color }} />
            ))
          : null}
      </Form.TagPicker>

      {scale ? (
        <Form.Dropdown id="estimate" title="Estimate" value={estimate} onChange={setEstimate}>
          <Form.Dropdown.Item
            title="No estimate"
            value=""
            icon={{ source: { light: "light/estimate.svg", dark: "dark/estimate.svg" } }}
          />

          {scale.map(({ estimate, label }) => {
            return (
              <Form.Dropdown.Item
                title={label}
                value={String(estimate)}
                key={estimate}
                icon={{ source: { light: "light/estimate.svg", dark: "dark/estimate.svg" } }}
              />
            );
          })}
        </Form.Dropdown>
      ) : null}

      <Form.DatePicker
        id="dueDate"
        title="Due Date"
        value={dueDate}
        onChange={setDueDate}
        type={Form.DatePicker.Type.Date}
      />

      {hasCycles || hasProjects || hasIssues ? <Form.Separator /> : null}

      {hasCycles ? (
        <Form.Dropdown id="cycleId" title="Cycle" value={cycleId} onChange={setCycleId} storeValue>
          <Form.Dropdown.Item
            title="No Cycle"
            value=""
            icon={{ source: { light: "light/no-cycle.svg", dark: "dark/no-cycle.svg" } }}
          />

          {getCycleOptions(cycles).map((cycle) => {
            return (
              <Form.Dropdown.Item title={cycle.title} value={cycle.id} key={cycle.id} icon={{ source: cycle.icon }} />
            );
          })}
        </Form.Dropdown>
      ) : null}

      {hasProjects ? (
        <Form.Dropdown id="projectId" title="Project" value={projectId} onChange={setProjectId} storeValue>
          <Form.Dropdown.Item
            title="No Project"
            value=""
            icon={{ source: { light: "light/no-project.svg", dark: "dark/no-project.svg" } }}
          />

          {projects.map((project) => {
            return (
              <Form.Dropdown.Item
                title={`${project.name} (${projectStatusText[project.state]})`}
                value={project.id}
                key={project.id}
                icon={{
                  source: project.icon || { light: "light/project.svg", dark: "dark/project.svg" },
                  tintColor: project.color,
                }}
              />
            );
          })}
        </Form.Dropdown>
      ) : null}

      {hasIssues ? (
        <Form.Dropdown id="parentId" title="Parent" value={parentId} onChange={setParentId}>
          <Form.Dropdown.Item
            title="No Issue"
            value=""
            icon={{ source: { light: "light/backlog.svg", dark: "dark/backlog.svg" } }}
          />

          {issues.map((issue) => {
            return (
              <Form.Dropdown.Item
                title={`${issue.identifier} - ${issue.title}`}
                value={issue.id}
                key={issue.id}
                icon={{ source: statusIcons[issue.state.type], tintColor: issue.state.color }}
              />
            );
          })}
        </Form.Dropdown>
      ) : null}
    </Form>
  );
}

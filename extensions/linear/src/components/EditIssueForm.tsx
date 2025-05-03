import { IssuePriorityValue, User } from "@linear/sdk";
import { Form, ActionPanel, Action, Icon, Toast, useNavigation, showToast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { MutatePromise } from "@raycast/utils";
import { useEffect, useState } from "react";

import { getLastCreatedIssues, IssueResult } from "../api/getIssues";
import { UpdateIssuePayload, updateIssue } from "../api/updateIssue";
import { getCycleOptions } from "../helpers/cycles";
import { getErrorMessage } from "../helpers/errors";
import { getEstimateScale } from "../helpers/estimates";
import { getMilestoneIcon } from "../helpers/milestones";
import { priorityIcons } from "../helpers/priorities";
import { getProjectIcon } from "../helpers/projects";
import { getOrderedStates, getStatusIcon } from "../helpers/states";
import { getTeamIcon } from "../helpers/teams";
import { getUserIcon } from "../helpers/users";
import useCycles from "../hooks/useCycles";
import useIssueDetail from "../hooks/useIssueDetail";
import useIssues from "../hooks/useIssues";
import useLabels from "../hooks/useLabels";
import useMilestones from "../hooks/useMilestones";
import useProjects from "../hooks/useProjects";
import useStates from "../hooks/useStates";
import useTeams from "../hooks/useTeams";
import useUsers from "../hooks/useUsers";

import { CreateIssueValues } from "./CreateIssueForm";

type EditIssueFormProps = {
  issue: IssueResult;
  mutateList?: MutatePromise<IssueResult[] | undefined>;
  mutateSubIssues?: MutatePromise<IssueResult[] | undefined>;
  priorities: IssuePriorityValue[] | undefined;
  me: User | undefined;
};

export default function EditIssueForm(props: EditIssueFormProps) {
  const { pop } = useNavigation();

  const { issue, isLoadingIssue, mutateDetail } = useIssueDetail(props.issue);

  const [teamQuery, setTeamQuery] = useState<string>("");
  const { teams, org, supportsTeamTypeahead, isLoadingTeams } = useTeams(teamQuery);
  const hasMoreThanOneTeam = teams && teams.length > 1;

  const [userQuery, setUserQuery] = useState<string>("");
  const { users, supportsUserTypeahead, isLoadingUsers } = useUsers(userQuery);

  const { handleSubmit, itemProps, values, setValue } = useForm<CreateIssueValues>({
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Editing issue" });

      try {
        const payload: UpdateIssuePayload = {
          teamId: values.teamId || props.issue.team.id,
          title: values.title,
          description: values.description,
          stateId: values.stateId,
          labelIds: values.labelIds,
          dueDate: values.dueDate,
          ...(scale && values.estimate ? { estimate: parseInt(values.estimate) } : {}),
          ...(values.assigneeId ? { assigneeId: values.assigneeId } : {}),
          ...(values.cycleId ? { cycleId: values.cycleId } : {}),
          ...(values.projectId ? { projectId: values.projectId } : {}),
          ...(values.milestoneId ? { projectMilestoneId: values.milestoneId } : {}),
          ...(values.parentId ? { parentId: values.parentId } : {}),
          priority: parseInt(values.priority),
        };

        const { success } = await updateIssue(issue.id, payload);

        if (success) {
          toast.style = Toast.Style.Success;
          toast.title = `Edited Issue • ${issue.identifier}`;

          pop();

          mutateDetail();

          if (props.mutateList) {
            props.mutateList();
          }

          if (props.mutateSubIssues) {
            props.mutateSubIssues();
          }
        }
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to edit issue";
        toast.message = getErrorMessage(error);
      }
    },
    validation: {
      teamId: hasMoreThanOneTeam ? FormValidation.Required : undefined,
      title: FormValidation.Required,
      stateId: FormValidation.Required,
      priority: FormValidation.Required,
    },
    initialValues: {
      teamId: props.issue.team.id,
      title: props.issue.title,
      description: issue.description,
      priority: String(props.issue.priority),
      stateId: props.issue.state.id,
      estimate: props.issue.estimate ? String(props.issue.estimate) : undefined,
      assigneeId: props.issue.assignee?.id,
      labelIds: props.issue.labels.nodes.map((l) => l.id),
      dueDate: issue.dueDate ? new Date(issue.dueDate) : null,
      cycleId: props.issue.cycle?.id,
      projectId: props.issue.project?.id,
      milestoneId: props.issue.projectMilestone?.id,
      parentId: props.issue.parent?.id,
    },
  });

  // The issue's detail (for description and due date) isn't returned
  // immediately, so the fields need to be properly updated once it's done
  useEffect(() => {
    setValue("description", issue.description || "");
    setValue("dueDate", issue.dueDate ? new Date(issue.dueDate) : null);
  }, [issue]);

  const execute = !!values.teamId && values.teamId.trim().length > 0;
  const { states } = useStates(values.teamId, { execute });
  const { labels } = useLabels(values.teamId, { execute });
  const { cycles } = useCycles(values.teamId, { execute });
  const { issues } = useIssues(getLastCreatedIssues, [], { execute });
  const { projects } = useProjects(values.teamId, { execute });
  const { milestones } = useMilestones(values.projectId, { execute: !!values.projectId });

  const team = teams?.find((team) => team.id === values.teamId);

  const scale = team
    ? getEstimateScale({
        issueEstimationType: team.issueEstimationType,
        issueEstimationAllowZero: team.issueEstimationAllowZero,
        issueEstimationExtended: team.issueEstimationExtended,
      })
    : null;

  const orderedStates = getOrderedStates(states || []);

  const hasStates = states && states.length > 0;
  const hasPriorities = props.priorities && props.priorities.length > 0;
  const hasLabels = labels && labels.length > 0;
  const hasCycles = cycles && cycles.length > 0;
  const hasProjects = projects && projects.length > 0;
  const hasMilestones = milestones && milestones.length > 0;
  const hasIssues = issues && issues.length > 0;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Edit Issue" />
        </ActionPanel>
      }
      isLoading={isLoadingTeams || isLoadingIssue || isLoadingUsers}
    >
      {(supportsTeamTypeahead || hasMoreThanOneTeam) && (
        <>
          <Form.Dropdown
            title="Team"
            {...itemProps.teamId}
            {...(supportsTeamTypeahead && {
              onSearchTextChange: setTeamQuery,
              isLoading: isLoadingTeams,
              throttle: true,
            })}
          >
            {teams?.map((team) => {
              return (
                <Form.Dropdown.Item title={team.name} value={team.id} key={team.id} icon={getTeamIcon(team, org)} />
              );
            })}
          </Form.Dropdown>
          <Form.Separator />
        </>
      )}

      <Form.TextField title="Title" placeholder="Issue title" autoFocus {...itemProps.title} />

      <Form.TextArea
        title="Description"
        placeholder="Add some details (supports Markdown, e.g. **bold**)"
        {...itemProps.description}
      />

      <Form.Dropdown title="Status" {...itemProps.stateId}>
        {hasStates
          ? orderedStates.map((state) => {
              return (
                <Form.Dropdown.Item title={state.name} value={state.id} key={state.id} icon={getStatusIcon(state)} />
              );
            })
          : null}
      </Form.Dropdown>

      <Form.Dropdown title="Priority" {...itemProps.priority}>
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

      <Form.Dropdown
        title="Assignee"
        {...itemProps.assigneeId}
        {...(supportsUserTypeahead && { onSearchTextChange: setUserQuery, isLoading: isLoadingUsers, throttle: true })}
      >
        <Form.Dropdown.Item title="Unassigned" value="" icon={Icon.Person} />

        {users?.map((user) => {
          return <Form.Dropdown.Item title={user.name} value={user.id} key={user.id} icon={getUserIcon(user)} />;
        })}
      </Form.Dropdown>

      <Form.TagPicker title="Labels" {...itemProps.labelIds} placeholder="Add label">
        {hasLabels
          ? labels.map(({ id, name, color }) => (
              <Form.TagPicker.Item title={name} value={id} key={id} icon={{ source: Icon.Dot, tintColor: color }} />
            ))
          : null}
      </Form.TagPicker>

      {scale ? (
        <Form.Dropdown title="Estimate" {...itemProps.estimate}>
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

      <Form.DatePicker title="Due Date" type={Form.DatePicker.Type.Date} {...itemProps.dueDate} />

      {hasCycles || hasProjects || hasIssues ? <Form.Separator /> : null}

      {hasCycles ? (
        <Form.Dropdown title="Cycle" {...itemProps.cycleId}>
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
        <Form.Dropdown title="Project" {...itemProps.projectId}>
          <Form.Dropdown.Item
            title="No Project"
            value=""
            icon={{ source: { light: "light/no-project.svg", dark: "dark/no-project.svg" } }}
          />

          {projects.map((project) => {
            return (
              <Form.Dropdown.Item
                title={`${project.name} (${project.status.name})`}
                value={project.id}
                key={project.id}
                icon={getProjectIcon(project)}
              />
            );
          })}
        </Form.Dropdown>
      ) : null}

      {hasMilestones ? (
        <Form.Dropdown title="Milestone" storeValue {...itemProps.milestoneId}>
          <Form.Dropdown.Item title="No Milestone" value="" icon={{ source: "linear-icons/no-milestone.svg" }} />

          {milestones.map((milestone) => {
            return (
              <Form.Dropdown.Item
                title={`${milestone.name}  (${milestone.targetDate || "No Target Date"})`}
                value={milestone.id}
                key={milestone.id}
                icon={getMilestoneIcon(milestone)}
              />
            );
          })}
        </Form.Dropdown>
      ) : null}

      {hasIssues ? (
        <Form.Dropdown title="Parent" {...itemProps.parentId}>
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
                icon={getStatusIcon(issue.state)}
              />
            );
          })}
        </Form.Dropdown>
      ) : null}
    </Form>
  );
}

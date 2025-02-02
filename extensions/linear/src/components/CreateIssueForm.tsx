import { useEffect, useState } from "react";
import {
  Clipboard,
  Form,
  ActionPanel,
  Action,
  Icon,
  Toast,
  getPreferenceValues,
  useNavigation,
  showToast,
} from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { IssuePriorityValue, User } from "@linear/sdk";

import { getLastCreatedIssues, IssueResult } from "../api/getIssues";
import { createIssue, CreateIssuePayload } from "../api/createIssue";
import { attachLinkUrl, createAttachment } from "../api/attachments";

import useLabels from "../hooks/useLabels";
import useStates from "../hooks/useStates";
import useTeams from "../hooks/useTeams";
import useCycles from "../hooks/useCycles";
import useIssues from "../hooks/useIssues";
import useProjects from "../hooks/useProjects";
import useMilestones from "../hooks/useMilestones";

import { getEstimateScale } from "../helpers/estimates";
import { getOrderedStates, getStatusIcon } from "../helpers/states";
import { getErrorMessage } from "../helpers/errors";
import { priorityIcons } from "../helpers/priorities";
import { getUserIcon } from "../helpers/users";
import { getCycleOptions } from "../helpers/cycles";
import { getProjectIcon, projectStatusText } from "../helpers/projects";
import { getTeamIcon } from "../helpers/teams";

import IssueDetail from "./IssueDetail";
import { getMilestoneIcon } from "../helpers/milestones";
import useUsers from "../hooks/useUsers";
import { getLinksFromNewLines } from "../helpers/links";

type CreateIssueFormProps = {
  assigneeId?: string;
  cycleId?: string;
  teamId?: string;
  projectId?: string;
  milestoneId?: string;
  parentId?: string;
  priorities: IssuePriorityValue[] | undefined;
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
  dueDate: Date | null;
  cycleId: string;
  projectId: string;
  milestoneId: string;
  parentId: string;
  attachments: string[];
  links: string;
};

function getCopyToastAction(copyToastAction: Preferences.CreateIssue["copyToastAction"], issue: IssueResult) {
  if (copyToastAction === "url") {
    return { title: "Copy Issue URL", onAction: () => Clipboard.copy(issue.url) };
  }

  if (copyToastAction === "id-as-link") {
    return {
      title: "Copy Issue ID as Link",
      onAction: () =>
        Clipboard.copy({
          text: `[${issue.identifier}](${issue.url})`,
          html: `<a href="${issue.url}">${issue.identifier}</a>`,
        }),
    };
  }

  if (copyToastAction === "title") {
    return { title: "Copy Issue Title", onAction: () => Clipboard.copy(issue.title) };
  }

  if (copyToastAction === "title-as-link") {
    return {
      title: "Copy Issue Title as Link",
      onAction: () =>
        Clipboard.copy({ text: `[${issue.title}](${issue.url})`, html: `<a href="${issue.url}">${issue.title}</a>` }),
    };
  }

  return { title: "Copy Issue ID", onAction: () => Clipboard.copy(issue.identifier) };
}

export default function CreateIssueForm(props: CreateIssueFormProps) {
  const { push } = useNavigation();
  const { autofocusField, copyToastAction } = getPreferenceValues<Preferences.CreateIssue>();

  const [teamQuery, setTeamQuery] = useState<string>("");
  const { teams, org, supportsTeamTypeahead, isLoadingTeams } = useTeams(teamQuery);
  const hasMoreThanOneTeam = teams && teams.length > 1;

  const [userQuery, setUserQuery] = useState<string>("");
  const { users, supportsUserTypeahead, isLoadingUsers } = useUsers(userQuery);

  const { handleSubmit, itemProps, values, setValue, focus, reset, setValidationError } = useForm<CreateIssueValues>({
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating issue" });

      const teamId = hasMoreThanOneTeam ? values.teamId : teams?.[0]?.id;

      if (!teamId) {
        // that should never happen
        setValidationError("teamId", "The team is required.");
        return false;
      }

      try {
        const payload: CreateIssuePayload = {
          teamId,
          title: values.title,
          description: values.description || "",
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

        const { success, issue } = await createIssue(payload);

        if (success && issue) {
          toast.style = Toast.Style.Success;
          toast.title = `Created Issue • ${issue?.identifier}`;

          toast.primaryAction = {
            title: "Open Issue",
            shortcut: { modifiers: ["cmd", "shift"], key: "o" },
            onAction: async () => {
              push(<IssueDetail issue={issue} priorities={props.priorities} me={props.me} />);
              await toast.hide();
            },
          };

          toast.secondaryAction = {
            shortcut: { modifiers: ["cmd", "shift"], key: "c" },
            ...getCopyToastAction(copyToastAction, issue),
          };

          reset({
            title: "",
            description: "",
            estimate: "",
            labelIds: [],
            dueDate: null,
            parentId: "",
            attachments: [],
            links: "",
          });

          hasMoreThanOneTeam && autofocusField ? focus(autofocusField) : focus("title");

          const links = getLinksFromNewLines(values.links);
          if (links.length > 0) {
            const linkWord = links.length === 1 ? "link" : "links";
            try {
              toast.message = `Attaching ${linkWord}…`;
              await Promise.all(
                links.map((link) =>
                  attachLinkUrl({
                    issueId: issue.id,
                    url: link,
                  }),
                ),
              );
              toast.message = `Successfully attached ${linkWord}`;
            } catch (error) {
              toast.style = Toast.Style.Failure;
              toast.title = `Failed attaching ${linkWord}`;
              toast.message = getErrorMessage(error);
            }
          }

          if (values.attachments.length > 0) {
            const attachmentWord = values.attachments.length === 1 ? "attachment" : "attachments";

            try {
              toast.message = `Uploading ${attachmentWord}…`;
              await Promise.all(
                values.attachments.map((attachment) =>
                  createAttachment({
                    issueId: issue.id,
                    url: attachment,
                  }),
                ),
              );
              toast.message = `Successfully uploaded ${attachmentWord}`;
            } catch (error) {
              toast.style = Toast.Style.Failure;
              toast.title = `Failed uploading ${attachmentWord}`;
              toast.message = getErrorMessage(error);
            }
          }
        }
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create issue";
        toast.message = getErrorMessage(error);
      }

      setValue("teamId", teamId);
    },
    validation: {
      teamId: hasMoreThanOneTeam ? FormValidation.Required : undefined,
      title: FormValidation.Required,
      stateId: FormValidation.Required,
      priority: FormValidation.Required,
    },
    initialValues: {
      teamId: props.draftValues?.teamId || props.teamId,
      title: props.draftValues?.title,
      description: props.draftValues?.description,
      priority: props.draftValues?.priority,
      stateId: props.draftValues?.stateId,
      estimate: props.draftValues?.estimate,
      assigneeId: props.draftValues?.assigneeId || props.assigneeId,
      labelIds: props.draftValues?.labelIds || [],
      dueDate: props.draftValues?.dueDate,
      cycleId: props.draftValues?.cycleId || props.cycleId,
      projectId: props.draftValues?.projectId || props.projectId,
      milestoneId: props.draftValues?.milestoneId || props.milestoneId,
      parentId: props.draftValues?.parentId || props.parentId,
      links: props.draftValues?.links || "",
    },
  });

  const execute = !!values.teamId && values.teamId.trim().length > 0;
  const { states } = useStates(values.teamId, { execute });
  const { labels } = useLabels(values.teamId, { execute });
  const { cycles } = useCycles(values.teamId, { execute });
  const { issues } = useIssues(getLastCreatedIssues, [], { execute });
  const { projects } = useProjects(values.teamId, { execute });
  const { milestones } = useMilestones(values.projectId, { execute: !!values.projectId });

  useEffect(() => {
    if (teams?.length === 1) {
      setValue("teamId", teams[0].id);
    }
  }, [teams]);

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
      enableDrafts={props.enableDrafts}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Create Issue" />
          <ActionPanel.Section>
            <Action
              title="Focus Title"
              icon={Icon.TextInput}
              onAction={() => focus("title")}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
            />
            <Action
              title="Focus Description"
              icon={Icon.TextInput}
              onAction={() => focus("description")}
              shortcut={{ modifiers: ["ctrl"], key: "e" }}
            />
            <Action
              title="Focus Status"
              icon={Icon.Circle}
              onAction={() => focus("stateId")}
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
            />
            <Action
              title="Focus Priority"
              icon={Icon.LevelMeter}
              onAction={() => focus("priority")}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            />
            <Action
              title="Focus Assignee"
              icon={Icon.AddPerson}
              onAction={() => focus("assigneeId")}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            />
            {scale ? (
              <Action
                title="Focus Estimate"
                icon={{ source: { light: "light/estimate.svg", dark: "dark/estimate.svg" } }}
                onAction={() => focus("estimate")}
                shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
              />
            ) : null}
            <Action
              title="Focus Due Date"
              icon={Icon.Calendar}
              onAction={() => focus("dueDate")}
              shortcut={{ modifiers: ["opt", "shift"], key: "d" }}
            />
            <Action
              title="Focus Labels"
              icon={Icon.Tag}
              onAction={() => focus("labelIds")}
              shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
            />
            {hasCycles ? (
              <Action
                title="Focus Cycle"
                icon={{ source: { light: "light/cycle.svg", dark: "dark/cycle.svg" } }}
                onAction={() => focus("cycleId")}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            ) : null}
            {hasProjects ? (
              <Action
                title="Focus Project"
                icon={{ source: { light: "light/project.svg", dark: "dark/project.svg" } }}
                onAction={() => focus("projectId")}
                shortcut={{ modifiers: ["ctrl", "shift"], key: "p" }}
              />
            ) : null}
            {hasMilestones ? (
              <Action
                title="Focus Milestone"
                icon={{ source: { light: "light/milestone.svg", dark: "dark/milestone.svg" } }}
                onAction={() => focus("milestoneId")}
                shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
              />
            ) : null}
            {hasIssues ? (
              <Action
                title="Focus Parent Issue"
                icon={{ source: { light: "light/backlog.svg", dark: "dark/backlog.svg" } }}
                onAction={() => focus("parentId")}
                shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
              />
            ) : null}
            <Action
              title="Focus Attachments"
              icon={Icon.NewDocument}
              onAction={() => focus("attachments")}
              shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "a" }}
            />
            <Action
              title="Focus Links"
              icon={Icon.Link}
              onAction={() => focus("links")}
              shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "l" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
      isLoading={isLoadingTeams || isLoadingUsers || props.isLoading}
    >
      {(supportsTeamTypeahead || hasMoreThanOneTeam) && (
        <>
          <Form.Dropdown
            title="Team"
            storeValue
            {...itemProps.teamId}
            {...(supportsTeamTypeahead && {
              onSearchTextChange: setTeamQuery,
              isLoading: isLoadingTeams,
              throttle: true,
            })}
          >
            {teams?.map((team) => (
              <Form.Dropdown.Item title={team.name} value={team.id} key={team.id} icon={getTeamIcon(team, org)} />
            ))}
          </Form.Dropdown>
          <Form.Separator />
        </>
      )}

      <Form.TextField
        title="Title"
        placeholder="Issue title"
        {...(autofocusField === "title" ? { autoFocus: true } : {})}
        {...itemProps.title}
      />

      <Form.TextArea
        title="Description"
        placeholder="Add some details (supports Markdown, e.g. **bold**)"
        enableMarkdown
        {...itemProps.description}
      />

      <Form.Dropdown title="Status" storeValue {...itemProps.stateId}>
        {hasStates
          ? orderedStates.map((state) => {
              return (
                <Form.Dropdown.Item title={state.name} value={state.id} key={state.id} icon={getStatusIcon(state)} />
              );
            })
          : null}
      </Form.Dropdown>

      <Form.Dropdown title="Priority" storeValue {...itemProps.priority}>
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
        storeValue
        {...itemProps.assigneeId}
        {...(supportsUserTypeahead && { onSearchTextChange: setUserQuery, isLoading: isLoadingUsers, throttle: true })}
      >
        <Form.Dropdown.Item title="Unassigned" value="" icon={Icon.Person} />

        {users?.map((user) => {
          return <Form.Dropdown.Item title={user.name} value={user.id} key={user.id} icon={getUserIcon(user)} />;
        })}
      </Form.Dropdown>

      <Form.TagPicker title="Labels" placeholder="Add label" {...itemProps.labelIds}>
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
        <Form.Dropdown title="Cycle" storeValue {...itemProps.cycleId}>
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
        <Form.Dropdown title="Project" storeValue {...itemProps.projectId}>
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
                title={`${milestone.name} (${milestone.targetDate || "No Target Date"})`}
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

      <Form.Separator />

      <Form.FilePicker title="Attachment" {...itemProps.attachments} />
      <Form.TextArea
        title={"Links"}
        placeholder={"https://a.com\nhttps://b.com\nNew link(s) on separate line(s)"}
        {...itemProps.links}
      />
    </Form>
  );
}

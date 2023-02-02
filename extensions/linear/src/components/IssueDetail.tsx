import { Detail, ActionPanel } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { IssuePriorityValue, User } from "@linear/sdk";

import { IssueResult } from "../api/getIssues";

import useIssueDetail from "../hooks/useIssueDetail";

import { formatCycle } from "../helpers/cycles";
import { EstimateType, getEstimateLabel } from "../helpers/estimates";
import { priorityIcons } from "../helpers/priorities";
import { statusIcons } from "../helpers/states";
import { getUserIcon } from "../helpers/users";

import IssueActions from "./IssueActions";
import { format } from "date-fns";
import { getDueDateIcon } from "../helpers/dates";
import { getProjectIcon } from "../helpers/projects";

type IssueDetailProps = {
  issue: IssueResult;
  mutateList?: MutatePromise<IssueResult[] | undefined>;
  priorities: IssuePriorityValue[] | undefined;
  users: User[] | undefined;
  me: User | undefined;
};

export default function IssueDetail({ issue: existingIssue, mutateList, priorities, users, me }: IssueDetailProps) {
  const { issue, isLoadingIssue, mutateDetail } = useIssueDetail(existingIssue);

  let markdown = `# ${issue?.title}`;

  if (issue?.description) {
    markdown += `\n\n${issue.description}`;
  }

  const cycle = issue?.cycle ? formatCycle(issue.cycle) : null;

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoadingIssue}
      {...(issue
        ? {
            metadata: (
              <Detail.Metadata>
                <Detail.Metadata.Label
                  title="Status"
                  text={issue.state.name}
                  icon={{ source: statusIcons[issue.state.type], tintColor: issue.state.color }}
                />

                <Detail.Metadata.Label
                  title="Priority"
                  text={issue.priorityLabel}
                  icon={{ source: priorityIcons[issue.priority] }}
                />

                <Detail.Metadata.Label
                  title="Assignee"
                  text={issue.assignee ? issue.assignee.displayName : "Unassigned"}
                  icon={getUserIcon(issue.assignee)}
                />

                {issue.team.issueEstimationType !== EstimateType.notUsed ? (
                  <Detail.Metadata.Label
                    title="Estimate"
                    text={getEstimateLabel({
                      estimate: issue.estimate,
                      issueEstimationType: issue.team.issueEstimationType,
                    })}
                    icon={{ source: { light: "light/estimate.svg", dark: "dark/estimate.svg" } }}
                  />
                ) : null}

                {issue.labels.nodes.length > 0 ? (
                  <Detail.Metadata.TagList title="Labels">
                    {issue.labels.nodes.map(({ id, name, color }) => (
                      <Detail.Metadata.TagList.Item key={id} text={name} color={color} />
                    ))}
                  </Detail.Metadata.TagList>
                ) : (
                  <Detail.Metadata.Label title="Labels" text="No Labels" />
                )}

                {issue.dueDate ? (
                  <Detail.Metadata.Label
                    title="Due Date"
                    text={format(new Date(issue.dueDate), "MM/dd/yyyy")}
                    icon={getDueDateIcon(new Date(issue.dueDate))}
                  />
                ) : null}

                <Detail.Metadata.Separator />

                <Detail.Metadata.Label
                  title="Cycle"
                  text={cycle ? cycle.title : "No Cycle"}
                  icon={{ source: cycle ? cycle.icon : { light: "light/no-cycle.svg", dark: "dark/no-cycle.svg" } }}
                />

                <Detail.Metadata.Label
                  title="Project"
                  text={issue.project ? issue.project.name : "No Project"}
                  icon={getProjectIcon(issue.project)}
                />

                <Detail.Metadata.Label
                  title="Parent Issue"
                  text={issue.parent ? issue.parent.title : "No Issue"}
                  icon={
                    issue.parent
                      ? { source: statusIcons[issue.parent.state.type], tintColor: issue.parent.state.color }
                      : { source: { light: "light/backlog.svg", dark: "dark/backlog.svg" } }
                  }
                />
              </Detail.Metadata>
            ),
            actions: (
              <ActionPanel>
                <IssueActions
                  issue={issue}
                  mutateList={mutateList}
                  mutateDetail={mutateDetail}
                  priorities={priorities}
                  users={users}
                  me={me}
                />
              </ActionPanel>
            ),
          }
        : {})}
    />
  );
}

import { IssuePriorityValue, User } from "@linear/sdk";
import { Detail, ActionPanel, Icon } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { format } from "date-fns";

import { IssueResult } from "../api/getIssues";
import { formatCycle } from "../helpers/cycles";
import { getDateIcon } from "../helpers/dates";
import { EstimateType, getEstimateLabel } from "../helpers/estimates";
import { getMilestoneIcon } from "../helpers/milestones";
import { priorityIcons } from "../helpers/priorities";
import { getProjectIcon } from "../helpers/projects";
import { getStatusIcon } from "../helpers/states";
import { getUserIcon } from "../helpers/users";
import useIssueDetail from "../hooks/useIssueDetail";

import IssueActions from "./IssueActions";

type IssueDetailProps = {
  issue: IssueResult;
  mutateList?: MutatePromise<IssueResult[] | undefined>;
  showAttachmentsAction?: boolean;
  priorities: IssuePriorityValue[] | undefined;
  me: User | undefined;
};

export default function IssueDetail({ issue: existingIssue, mutateList, priorities, me }: IssueDetailProps) {
  const { issue, isLoadingIssue, mutateDetail } = useIssueDetail(existingIssue);

  let markdown = `# ${issue?.title}`;

  if (issue?.description) {
    markdown += `\n\n${issue.description}`;
  }

  const cycle = issue?.cycle ? formatCycle(issue.cycle) : null;

  const relatedIssues = issue.relations ? issue.relations.nodes.filter((node) => node.type == "related") : null;
  const duplicateIssues = issue.relations ? issue.relations.nodes.filter((node) => node.type == "duplicate") : null;

  const linksCount = issue.attachments?.nodes.length ?? 0;

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoadingIssue}
      {...(issue
        ? {
            metadata: (
              <Detail.Metadata>
                <Detail.Metadata.Label title="Status" text={issue.state.name} icon={getStatusIcon(issue.state)} />

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
                    icon={getDateIcon(new Date(issue.dueDate))}
                  />
                ) : null}

                {linksCount > 0 ? (
                  <Detail.Metadata.Label
                    title="Links"
                    text={`${linksCount > 1 ? `${linksCount} links` : "1 link"}`}
                    icon={Icon.Link}
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
                  title="Milestone"
                  text={issue.projectMilestone ? issue.projectMilestone.name : "No Milestone"}
                  icon={getMilestoneIcon(issue.projectMilestone)}
                />

                <Detail.Metadata.Label
                  title="Parent Issue"
                  text={issue.parent ? issue.parent.title : "No Issue"}
                  icon={
                    issue.parent
                      ? getStatusIcon(issue.parent.state)
                      : { source: { light: "light/backlog.svg", dark: "dark/backlog.svg" } }
                  }
                />

                {!!relatedIssues && relatedIssues.length > 0 ? (
                  <Detail.Metadata.TagList title="Related">
                    {relatedIssues.map(({ id, relatedIssue }) => (
                      <Detail.Metadata.TagList.Item key={id} text={relatedIssue.identifier} />
                    ))}
                  </Detail.Metadata.TagList>
                ) : null}

                {!!duplicateIssues && duplicateIssues.length > 0 ? (
                  <Detail.Metadata.TagList title="Duplicates">
                    {duplicateIssues.map(({ id, relatedIssue }) => (
                      <Detail.Metadata.TagList.Item key={id} text={relatedIssue.identifier} />
                    ))}
                  </Detail.Metadata.TagList>
                ) : null}
              </Detail.Metadata>
            ),
            actions: (
              <ActionPanel>
                <IssueActions
                  issue={issue}
                  mutateList={mutateList}
                  mutateDetail={mutateDetail}
                  priorities={priorities}
                  showAttachmentsAction={linksCount > 0}
                  attachments={issue.attachments?.nodes ?? []}
                  me={me}
                />
              </ActionPanel>
            ),
          }
        : {})}
    />
  );
}

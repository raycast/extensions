import { Action, ActionPanel, List } from "@raycast/api";
import { IssuePriorityValue, User } from "@linear/sdk";

import { getProjectIssues } from "../api/getIssues";

import useIssues from "../hooks/useIssues";

import StateIssueList from "./StateIssueList";
import CreateIssueForm from "./CreateIssueForm";
import { useMemo } from "react";
import useMilestones from "../hooks/useMilestones";
import { useCachedState } from "@raycast/utils";
import { getMilestoneIcon } from "../helpers/milestones";

type ProjectIssuesProps = {
  projectId: string;
  teamId?: string;
  priorities: IssuePriorityValue[] | undefined;
  users: User[] | undefined;
  me: User | undefined;
};

export default function ProjectIssues({ projectId, priorities, me, users }: ProjectIssuesProps) {
  const { issues, isLoadingIssues, mutateList } = useIssues(getProjectIssues, [projectId]);
  const [milestone, setMilestone] = useCachedState<string>("");
  const { milestones } = useMilestones(projectId);

  const filteredIssues = useMemo(() => {
    if (!issues) {
      return [];
    }

    if (milestone === "") {
      return issues;
    }

    const filteredIssues = [];
    for (const issue of issues) {
      if (issue.projectMilestone && issue.projectMilestone?.id === milestone) {
        filteredIssues.push(issue);
      }
    }

    return filteredIssues || [];
  }, [milestone, issues, milestones]);

  return (
    <List
      isLoading={isLoadingIssues}
      {...(milestones && milestones.length > 0
        ? {
            searchBarAccessory: (
              <List.Dropdown tooltip="Change Milestone" onChange={setMilestone} value={milestone}>
                <List.Dropdown.Item value="" title="All Milestones" />

                <List.Dropdown.Section>
                  {milestones?.map((milestone) => (
                    <List.Dropdown.Item
                      key={milestone.id}
                      value={milestone.id}
                      title={`${milestone.name}  (${milestone.targetDate || "No Target Date"})`}
                      icon={getMilestoneIcon(milestone)}
                    />
                  ))}
                </List.Dropdown.Section>
              </List.Dropdown>
            ),
          }
        : {})}
      filtering={{ keepSectionOrder: true }}
      searchBarPlaceholder="Filter by ID, title, status, assignee or priority"
    >
      <List.EmptyView
        title="No issues"
        description="There are no issues in the project."
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Issue"
              target={<CreateIssueForm projectId={projectId} priorities={priorities} users={users} me={me} />}
            />
          </ActionPanel>
        }
      />

      <StateIssueList issues={filteredIssues} mutateList={mutateList} priorities={priorities} users={users} me={me} />
    </List>
  );
}

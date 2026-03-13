import { getLinearClient } from "../api/linearClient";

export function formatConfirmation({ name, value }: { name: string; value: undefined | number | string | string[] }) {
  const { linearClient } = getLinearClient();

  const formatters = {
    assigneeId: async (assigneeId: string) => {
      const user = await linearClient.user(assigneeId);
      return { name: "Assignee", value: user.name };
    },
    issueId: async (issueId: string) => {
      const issue = await linearClient.issue(issueId);
      return { name: "Issue", value: issue.title };
    },
    teamId: async (teamId: string) => {
      const team = await linearClient.team(teamId);
      return { name: "Team", value: team.name };
    },
    stateId: async (stateId: string) => {
      const state = await linearClient.workflowState(stateId);
      return { name: "State", value: state.name };
    },
    parentId: async (parentId: string) => {
      const parentIssue = await linearClient.issue(parentId);
      return { name: "Parent", value: parentIssue.title };
    },
    projectId: async (projectId: string) => {
      const project = await linearClient.project(projectId);
      return { name: "Project", value: project.name };
    },
    labelIds: async (labelIds: string[]) => {
      const labels = await Promise.all(
        labelIds.map(async (id: string) => {
          const data = await linearClient.issueLabel(id);
          return data.name;
        }),
      );
      return { name: "Labels", value: labels.join(", ") };
    },
    cycleId: async (cycleId: string) => {
      const cycle = await linearClient.cycle(cycleId);
      return { name: "Cycle", value: cycle.name };
    },
    projectMilestoneId: async (projectMilestoneId: string) => {
      const projectMilestone = await linearClient.projectMilestone(projectMilestoneId);
      return { name: "Milestone", value: projectMilestone.name };
    },
  };

  if (name in formatters) {
    if (name === "labelIds") {
      return formatters["labelIds"](value as string[]);
    }
    if (Array.isArray(value)) {
      return { name, value };
    }
    if (typeof value === "undefined") {
      return { name, value: "-" };
    }
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const { labelIds, ...stringFormatters } = formatters;
    /* eslint-enable @typescript-eslint/no-unused-vars */
    return stringFormatters[name as keyof typeof stringFormatters](value as string);
  } else {
    value = (value || "").toString();
  }
  return { name, value };
}

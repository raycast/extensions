import { Action, ActionPanel, Color } from "@raycast/api";
import { useState } from "react";

import { IssueResult } from "../../api/getIssues";
import { MilestoneResult } from "../../api/getMilestones";
import { getMilestoneIcon } from "../../helpers/milestones";
import useMilestones from "../../hooks/useMilestones";

import { UpdateIssueParams } from "./IssueActions";

export default function MilestoneSubmenu({
  issue,
  updateIssue,
}: {
  issue: IssueResult;
  updateIssue: (params: UpdateIssueParams) => void;
}) {
  const [load, setLoad] = useState(false);
  const { milestones, isLoadingMilestones } = useMilestones(issue.project?.id, { execute: load });

  async function setMilestone(milestone: MilestoneResult | null) {
    const currentMilestone = issue.projectMilestone;
    updateIssue({
      animatedTitle: "Setting milestone",
      payload: { projectMilestoneId: milestone ? milestone.id : null },
      optimisticUpdate(issue) {
        return {
          ...issue,
          milestone: milestone || undefined,
        };
      },
      rollbackUpdate(issue) {
        return {
          ...issue,
          milestone: currentMilestone,
        };
      },
      successTitle: milestone ? "Set milestone" : `Removed milestone from ${issue.identifier}`,
      successMessage: milestone ? `"${milestone.name}" added to ${issue.identifier}` : "",
      errorTitle: "Failed to set milestone",
    });
  }

  return (
    <ActionPanel.Submenu
      title="Set Milestone"
      icon={{ source: "linear-icons/milestone.svg", tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["ctrl", "shift"], key: "m" }}
      onOpen={() => setLoad(true)}
    >
      <Action
        title="No Milestone"
        icon={{ source: "linear-icons/no-milestone.svg" }}
        onAction={() => setMilestone(null)}
      />

      {!milestones && isLoadingMilestones ? (
        <Action title="Loading…" />
      ) : (
        (milestones || []).map((milestone) => (
          <Action
            key={milestone.id}
            autoFocus={milestone.id === issue.projectMilestone?.id}
            title={`${milestone.name}  (${milestone.targetDate || "No Target Date"})`}
            icon={getMilestoneIcon(milestone)}
            onAction={() => setMilestone(milestone)}
          />
        ))
      )}
    </ActionPanel.Submenu>
  );
}

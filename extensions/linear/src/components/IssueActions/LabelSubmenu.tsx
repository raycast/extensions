import { Action, ActionPanel, Icon } from "@raycast/api";
import { partition } from "lodash";
import { useState } from "react";

import { IssueResult } from "../../api/getIssues";
import { LabelResult } from "../../api/getLabels";
import useLabels from "../../hooks/useLabels";

import { UpdateIssueParams } from "./IssueActions";

export default function LabelSubmenu({
  issue,
  updateIssue,
}: {
  issue: IssueResult;
  updateIssue: (params: UpdateIssueParams) => void;
}) {
  const [load, setLoad] = useState(false);
  const { labels } = useLabels(issue.team.id, { execute: load });

  const [, availableLabels] = partition(labels || [], (label) =>
    issue.labels.nodes.map((issueLabel) => issueLabel.id).includes(label.id),
  );

  async function addLabel(label: LabelResult) {
    const labelIds = issue.labels.nodes.map((l) => l.id);

    updateIssue({
      animatedTitle: "Adding label",
      payload: { labelIds: [...labelIds, label.id] },
      optimisticUpdate(issue) {
        return {
          ...issue,
          labels: { ...issue.labels, nodes: [...issue.labels.nodes, label] },
        };
      },
      rollbackUpdate(issue) {
        return {
          ...issue,
          labels: { ...issue.labels, nodes: issue.labels.nodes.filter((x) => x.id !== label.id) },
        };
      },
      successTitle: "Added label",
      successMessage: `Label "${label.name}" added to ${issue.identifier}`,
      errorTitle: "Failed to add label",
    });
  }

  async function removeLabel(label: LabelResult) {
    const labelIds = issue.labels.nodes.map((l) => l.id);

    updateIssue({
      animatedTitle: "Remove label",
      payload: { labelIds: labelIds.filter((id) => id !== label.id) },
      optimisticUpdate(issue) {
        return {
          ...issue,
          labels: { ...issue.labels, nodes: issue.labels.nodes.filter((x) => x.id !== label.id) },
        };
      },
      rollbackUpdate(issue) {
        return {
          ...issue,
          labels: { ...issue.labels, nodes: [...issue.labels.nodes, label] },
        };
      },
      successTitle: "Removed label",
      successMessage: `Label "${label.name}" removed from ${issue.identifier}`,
      errorTitle: "Failed to remove label",
    });
  }

  return (
    <>
      <ActionPanel.Submenu
        title="Add Label"
        icon={Icon.Tag}
        shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
        onOpen={() => setLoad(true)}
      >
        {availableLabels.map((label) => (
          <Action
            key={label.id}
            title={label.name}
            icon={{ source: Icon.Dot, tintColor: label.color }}
            onAction={() => addLabel(label)}
          />
        ))}
      </ActionPanel.Submenu>

      {issue.labels.nodes.length > 0 ? (
        <ActionPanel.Submenu title="Remove Label" icon={Icon.Tag} shortcut={{ modifiers: ["ctrl", "shift"], key: "l" }}>
          {issue.labels.nodes.map((label) => (
            <Action
              key={label.id}
              title={label.name}
              icon={{ source: Icon.Dot, tintColor: label.color }}
              onAction={() => removeLabel(label)}
            />
          ))}
        </ActionPanel.Submenu>
      ) : null}
    </>
  );
}

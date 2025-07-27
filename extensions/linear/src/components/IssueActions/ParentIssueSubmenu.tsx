import { Action, ActionPanel } from "@raycast/api";
import { useState } from "react";

import { getLastCreatedIssues, IssueResult } from "../../api/getIssues";
import { getStatusIcon } from "../../helpers/states";
import useIssues from "../../hooks/useIssues";

import { UpdateIssueParams } from "./IssueActions";

export default function ParentIssueSubmenus({
  issue,
  updateIssue,
}: {
  issue: IssueResult;
  updateIssue: (params: UpdateIssueParams) => void;
}) {
  const [load, setLoad] = useState(false);
  const { issues, isLoadingIssues } = useIssues(getLastCreatedIssues, [], { execute: load });

  const currentParent = issue.parent;
  const parentIssueId = currentParent?.id;
  const hasParentIssue = Boolean(parentIssueId);

  async function setParentIssue(parentIssue: IssueResult | null) {
    updateIssue({
      animatedTitle: "Setting parent issue",
      payload: { parentId: parentIssue ? parentIssue.id : null },
      optimisticUpdate(issue) {
        return {
          ...issue,
          parent: parentIssue || undefined,
        };
      },
      rollbackUpdate(issue) {
        return {
          ...issue,
          parent: currentParent,
        };
      },
      successTitle: "Set parent issue",
      successMessage: parentIssue
        ? `${parentIssue.identifier} set as parent issue`
        : `Removed parent issue from ${issue.identifier}`,
      errorTitle: "Failed to set parent issue",
    });
  }

  return (
    <>
      <ActionPanel.Submenu
        title={hasParentIssue ? "Change Parent Issue" : "Set Parent Issue"}
        icon={{ source: { light: "light/parent-issue.svg", dark: "dark/parent-issue.svg" } }}
        shortcut={{ modifiers: ["ctrl", "shift"], key: "i" }}
        onOpen={() => setLoad(true)}
      >
        {!issues && isLoadingIssues ? (
          <Action title="Loading…" />
        ) : (
          (issues || []).map((issue) => {
            return (
              <Action
                key={issue.id}
                autoFocus={issue.id === parentIssueId}
                title={`${issue.identifier} - ${issue.title}`}
                icon={getStatusIcon(issue.state)}
                onAction={() => setParentIssue(issue)}
              />
            );
          })
        )}
        {}
      </ActionPanel.Submenu>

      {hasParentIssue ? (
        <Action
          title="Remove Parent Issue"
          icon={{ source: { light: "light/parent-issue.svg", dark: "dark/parent-issue.svg" } }}
          shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
          onAction={() => setParentIssue(null)}
        />
      ) : null}
    </>
  );
}

import { Action, ActionPanel, Icon } from "@raycast/api";
import { useState } from "react";

import { IssueResult, IssueState } from "../../api/getIssues";
import { getOrderedStates, getStatusIcon } from "../../helpers/states";
import useStates from "../../hooks/useStates";

import { UpdateIssueParams } from "./IssueActions";

export default function StateSubmenu({
  issue,
  updateIssue,
}: {
  issue: IssueResult;
  updateIssue: (params: UpdateIssueParams) => void;
}) {
  const [load, setLoad] = useState(false);
  const { states, isLoadingStates } = useStates(issue.team.id, { execute: load });

  const orderedStates = getOrderedStates(states || []);

  async function setStatus(state: IssueState) {
    const currentState = issue.state;
    updateIssue({
      animatedTitle: "Setting status",
      payload: { stateId: state.id },
      optimisticUpdate(issue) {
        return {
          ...issue,
          state,
        };
      },
      rollbackUpdate(issue) {
        return {
          ...issue,
          state: currentState,
        };
      },
      successTitle: "Set status",
      successMessage: `${issue.identifier} set to ${state.name}`,
      errorTitle: "Failed to set status",
    });
  }

  return (
    <ActionPanel.Submenu
      icon={Icon.Circle}
      title="Set Status"
      shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
      onOpen={() => setLoad(true)}
    >
      {orderedStates.length === 0 && isLoadingStates ? (
        <Action title="Loading…" />
      ) : (
        orderedStates.map((state) => (
          <Action
            key={state.id}
            autoFocus={state.id === issue.state.id}
            title={state.name}
            icon={getStatusIcon(state)}
            onAction={() => setStatus(state)}
          />
        ))
      )}
    </ActionPanel.Submenu>
  );
}

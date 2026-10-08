import { ActionPanel, Action, Icon } from "@raycast/api";
import { getStateIcon } from "../../helpers/icons";
import { useStates } from "../../hooks/useStates";
import { Issue as WorkItem, State } from "@makeplane/plane-node-sdk";
import { UpdateWorkItem } from "./WorkItemActions";
import { useState } from "react";

interface UpdateStateSubmenuProps {
  workItem: WorkItem;
  handleUpdateWorkItem: (updatePayload: UpdateWorkItem) => void;
}

export default function UpdateStateSubmenu({ workItem, handleUpdateWorkItem }: UpdateStateSubmenuProps) {
  const [load, setLoad] = useState(false);

  if (!workItem.project) {
    return null;
  }

  const { states, isLoading: isLoadingStates } = useStates(workItem.project, { execute: load });

  const handleUpdateState = (state: State) => {
    handleUpdateWorkItem({
      updatePayload: { state: state.id },
      updatingMessage: "Updating State",
      successMessage: `State updated to ${state.name}`,
      errorMessage: `Error updating state to ${state.name}`,
    });
    setLoad(false);
  };

  return (
    <ActionPanel.Submenu
      icon={Icon.Circle}
      title="Update State"
      shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
      onOpen={() => setLoad(true)}
    >
      {states.length === 0 && isLoadingStates ? (
        <Action title="Loading…" />
      ) : (
        states.map((state) => (
          <Action
            key={state.id}
            autoFocus={state.id === workItem.state}
            title={state.name}
            icon={getStateIcon(state)}
            onAction={() => handleUpdateState(state)}
          />
        ))
      )}
    </ActionPanel.Submenu>
  );
}

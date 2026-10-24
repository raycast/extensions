import { ActionPanel, Action, Icon } from "@raycast/api";
import { getStateIcon } from "../../helpers/icons";
import { useStates } from "../../hooks/useStates";
import { State } from "@makeplane/plane-node-sdk";
import { useState } from "react";

interface UpdateStateSubmenuProps {
  projectId: string;
  currentStateId?: string | null;
  onSelect: (state: State) => void;
}

/** States load only when the submenu opens, so list rows don't each spend a request. */
export default function UpdateStateSubmenu({ projectId, currentStateId, onSelect }: UpdateStateSubmenuProps) {
  const [load, setLoad] = useState(false);
  const { states, isLoading: isLoadingStates } = useStates(projectId, { execute: load && !!projectId });

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
            autoFocus={state.id === currentStateId}
            title={state.name}
            icon={getStateIcon(state)}
            onAction={() => onSelect(state)}
          />
        ))
      )}
    </ActionPanel.Submenu>
  );
}

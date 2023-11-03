import type { FC } from "react";
import { Action, Icon, useNavigation } from "@raycast/api";
import { docs } from "../../utils";
import { Documents } from "../../views";

export const RefreshLocalReferencesActions: FC = () => {
  const { push } = useNavigation();
  const refreshLocalReferences = async () => {
    try {
      await docs.index();
      push(<Documents />);
    } catch (error) {
      console.error(error);
      return;
    }
  };
  return (
    <Action
      icon={Icon.RotateClockwise}
      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      title="Refresh Local References"
      onAction={refreshLocalReferences}
    />
  );
};

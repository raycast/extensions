import { ActionPanel, Action, Icon } from "@raycast/api";
import { priorityToIcon } from "../../helpers/icons";
import { Issue as WorkItem, PriorityEnum } from "@makeplane/plane-node-sdk";
import { UpdateWorkItem } from "./WorkItemActions";
import { capitalizeString } from "../../helpers/strings";

interface UpdatePrioritySubmenuProps {
  workItem: WorkItem;
  handleUpdateWorkItem: (updatePayload: UpdateWorkItem) => void;
}

export default function UpdatePrioritySubmenu({ workItem, handleUpdateWorkItem }: UpdatePrioritySubmenuProps) {
  if (!workItem.project) {
    return null;
  }

  const priorities = Object.values(PriorityEnum);

  const handleUpdatePriority = (priority: PriorityEnum) => {
    handleUpdateWorkItem({
      updatePayload: { priority },
      updatingMessage: "Updating Priority",
      successMessage: `Priority updated to ${capitalizeString(priority.toString())}`,
      errorMessage: `Error updating priority to ${capitalizeString(priority.toString())}`,
    });
  };

  return (
    <ActionPanel.Submenu
      icon={Icon.FullSignal}
      title="Update Priority"
      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
    >
      {priorities.map((priority) => (
        <Action
          key={priority}
          autoFocus={priority === workItem.priority}
          title={capitalizeString(priority.toString())}
          icon={priorityToIcon(priority)}
          onAction={() => handleUpdatePriority(priority)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

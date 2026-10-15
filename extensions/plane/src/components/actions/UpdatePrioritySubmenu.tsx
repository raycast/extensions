import { ActionPanel, Action, Icon } from "@raycast/api";
import { priorityToIcon } from "../../helpers/icons";
import { PriorityEnum } from "@makeplane/plane-node-sdk";
import { capitalizeString } from "../../helpers/strings";

interface UpdatePrioritySubmenuProps {
  currentPriority?: PriorityEnum;
  onSelect: (priority: PriorityEnum) => void;
}

export default function UpdatePrioritySubmenu({ currentPriority, onSelect }: UpdatePrioritySubmenuProps) {
  const priorities = Object.values(PriorityEnum);

  return (
    <ActionPanel.Submenu
      icon={Icon.FullSignal}
      title="Update Priority"
      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
    >
      {priorities.map((priority) => (
        <Action
          key={priority}
          autoFocus={priority === currentPriority}
          title={capitalizeString(priority.toString())}
          icon={priorityToIcon(priority)}
          onAction={() => onSelect(priority)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

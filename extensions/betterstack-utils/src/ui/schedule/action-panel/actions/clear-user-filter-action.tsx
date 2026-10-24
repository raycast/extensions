import { Action, Icon } from "@raycast/api";

type ClearUserFilterActionProps = {
  selectedUser: string;
  onUserSelect: (user: string) => void;
};

export function ClearUserFilterAction({ selectedUser, onUserSelect }: ClearUserFilterActionProps) {
  if (!selectedUser) return null;
  return (
    <Action
      title="Clear User Filter"
      icon={Icon.XMarkCircle}
      shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
      onAction={() => onUserSelect("")}
    />
  );
}

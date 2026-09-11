import { Action, ActionPanel, Icon } from "@raycast/api";

type FilterByUserSubmenuProps = {
  userNames: string[];
  selectedUser: string;
  onUserSelect: (user: string) => void;
};

export function FilterByUserSubmenu({ userNames, selectedUser, onUserSelect }: FilterByUserSubmenuProps) {
  if (userNames.length === 0) return null;
  const title = selectedUser ? `Filter: ${selectedUser}` : "Filter by Team Member";

  return (
    <ActionPanel.Submenu title={title} icon={Icon.Person} shortcut={{ modifiers: ["cmd"], key: "f" }}>
      <Action title="All Users" onAction={() => onUserSelect("")} />
      {userNames.map((name) => (
        <Action key={name} title={name} onAction={() => onUserSelect(name)} />
      ))}
    </ActionPanel.Submenu>
  );
}
